from __future__ import annotations

import re
import textwrap
from dataclasses import dataclass
from io import BytesIO
from typing import Optional
from uuid import uuid4

import fitz

from app.models.schemas import (
    ClauseDecisionRequest,
    ClauseSuggestionRequest,
    ReviewClause,
    ReviewSessionResponse,
)
from app.services.chunker import chunk_legal_text
from app.services.llm_analyzer import analyze_clauses_with_llm
from app.services.pdf_parser import clean_legal_text, extract_text_from_pdf_bytes
from app.services.risk_engine import (
    apply_risk_scoring,
    derive_overall_risk,
    generate_top_red_flags,
    sort_clauses_by_risk,
)
from app.services.summarizer import generate_document_summary


@dataclass
class _ReviewSession:
    session_id: str
    document_name: str
    source_text: str
    source_pdf_bytes: Optional[bytes]
    overall_risk: str
    summary: str
    top_red_flags: list[str]
    clauses: list[ReviewClause]


REVIEW_SESSIONS: dict[str, _ReviewSession] = {}


def create_review_session_from_pdf(file_bytes: bytes, document_name: str) -> ReviewSessionResponse:
    raw_text = extract_text_from_pdf_bytes(file_bytes)
    cleaned_text = clean_legal_text(raw_text)
    if not cleaned_text:
        raise ValueError("No readable text found in this PDF.")
    return _create_review_session(cleaned_text, document_name, source_pdf_bytes=file_bytes)


def create_review_session_from_text(text: str, document_name: str) -> ReviewSessionResponse:
    cleaned_text = clean_legal_text(text)
    if not cleaned_text:
        raise ValueError("Input text is empty after cleaning.")
    return _create_review_session(cleaned_text, document_name, source_pdf_bytes=None)


def get_review_session(session_id: str) -> ReviewSessionResponse:
    session = REVIEW_SESSIONS.get(session_id)
    if session is None:
        raise KeyError("Review session not found.")
    return _to_response(session)


def suggest_clause_change(
    session_id: str,
    clause_id: str,
    payload: ClauseSuggestionRequest,
) -> ReviewSessionResponse:
    session = _require_session(session_id)
    clause = _require_clause(session, clause_id)

    suggested_text, reason = _build_suggestion(clause.original_text, payload.instruction)
    clause.suggested_text = suggested_text
    clause.suggestion_reason = reason
    clause.suggestion_instruction = payload.instruction
    clause.status = "pending"

    _refresh_summary_fields(session)
    return _to_response(session)


def apply_clause_decision(
    session_id: str,
    clause_id: str,
    payload: ClauseDecisionRequest,
) -> ReviewSessionResponse:
    session = _require_session(session_id)
    clause = _require_clause(session, clause_id)

    if payload.decision == "accept":
        if payload.custom_text and payload.custom_text.strip():
            clause.suggested_text = payload.custom_text.strip()
        if not clause.suggested_text:
            raise ValueError("No suggested clause text exists yet. Request a suggestion first.")
        clause.status = "accepted"
    else:
        clause.status = "declined"

    _refresh_summary_fields(session)
    return _to_response(session)


def build_risk_highlight_pdf(session_id: str) -> bytes:
    session = _require_session(session_id)

    source_pdf_bytes = session.source_pdf_bytes or _render_text_to_pdf_bytes(
        title=f"{session.document_name} (Generated View)",
        body=session.source_text,
    )

    doc = fitz.open(stream=source_pdf_bytes, filetype="pdf")
    highlights_added = 0

    for clause in session.clauses:
        if clause.risk_score < 3:
            continue

        search_token = _best_search_token(clause.original_text)
        if not search_token:
            continue

        color = (1, 0.3, 0.3) if clause.risk_level == "High" else (1, 0.7, 0.1)
        for page in doc:
            matches = page.search_for(search_token)
            for rect in matches[:2]:
                annot = page.add_highlight_annot(rect)
                annot.set_colors(stroke=color)
                annot.set_info(content=f"{clause.risk_level} risk: {clause.clause_title}")
                annot.update()
                highlights_added += 1

    if highlights_added == 0 and len(doc) > 0:
        note_page = doc[0]
        risk_lines = [
            f"- {clause.clause_title} ({clause.risk_level})"
            for clause in session.clauses
            if clause.risk_score >= 3
        ]
        if risk_lines:
            note = "Highlighted risks could not be mapped by text search.\n\nRisks:\n" + "\n".join(risk_lines)
            note_page.insert_textbox(
                fitz.Rect(36, 36, note_page.rect.width - 36, 180),
                note,
                fontsize=9,
                color=(0.75, 0.2, 0.2),
            )

    out = doc.tobytes()
    doc.close()
    return out


def build_revised_pdf(session_id: str) -> bytes:
    session = _require_session(session_id)

    blocks: list[str] = []
    for idx, clause in enumerate(session.clauses, start=1):
        effective_text = clause.original_text
        if clause.status == "accepted" and clause.suggested_text:
            effective_text = clause.suggested_text

        blocks.append(f"{idx}. {clause.clause_title}\nStatus: {clause.status.upper()}\n{effective_text}")

    revised_text = "\n\n".join(blocks)
    header = f"Revised Contract Draft\nDocument: {session.document_name}\nOverall Risk: {session.overall_risk}\n"
    return _render_text_to_pdf_bytes(title=session.document_name, body=f"{header}\n{revised_text}")


def _create_review_session(
    cleaned_text: str,
    document_name: str,
    source_pdf_bytes: Optional[bytes],
) -> ReviewSessionResponse:
    chunks = chunk_legal_text(cleaned_text)
    if not chunks:
        raise ValueError("Could not split document into clauses.")

    analyzed = analyze_clauses_with_llm(chunks)
    scored_in_order = apply_risk_scoring(analyzed)
    ranked = sort_clauses_by_risk(scored_in_order)

    overall_risk = derive_overall_risk(ranked)
    top_red_flags = generate_top_red_flags(ranked)
    summary = generate_document_summary(
        document_name=document_name,
        clauses=ranked,
        overall_risk=overall_risk,
        top_red_flags=top_red_flags,
    )

    review_clauses: list[ReviewClause] = []
    for idx, (chunk, analysis) in enumerate(zip(chunks, scored_in_order), start=1):
        review_clauses.append(
            ReviewClause(
                clause_id=f"clause-{idx}",
                clause_title=analysis.clause_title,
                plain_english=analysis.plain_english,
                risk_level=analysis.risk_level,
                risk_score=analysis.risk_score,
                risk_type=analysis.risk_type,
                why_risky=analysis.why_risky,
                who_it_favors=analysis.who_it_favors,
                original_text=chunk,
                status="pending",
            )
        )

    session = _ReviewSession(
        session_id=str(uuid4()),
        document_name=document_name,
        source_text=cleaned_text,
        source_pdf_bytes=source_pdf_bytes,
        overall_risk=overall_risk,
        summary=summary,
        top_red_flags=top_red_flags,
        clauses=review_clauses,
    )
    REVIEW_SESSIONS[session.session_id] = session
    return _to_response(session)


def _refresh_summary_fields(session: _ReviewSession) -> None:
    ranked = sorted(session.clauses, key=lambda item: item.risk_score, reverse=True)

    score_avg = sum(clause.risk_score for clause in ranked) / len(ranked) if ranked else 1
    high_count = sum(1 for clause in ranked if clause.risk_score == 5)
    if score_avg >= 4 or high_count >= 2:
        session.overall_risk = "High"
    elif score_avg >= 2:
        session.overall_risk = "Medium"
    else:
        session.overall_risk = "Low"

    risk_source = [clause for clause in ranked if clause.risk_score >= 3] or ranked
    session.top_red_flags = [f"{clause.clause_title}: {clause.why_risky}" for clause in risk_source[:3]]

    session.summary = (
        f"{session.document_name} currently has an overall {session.overall_risk} risk profile. "
        f"Accepted clauses are reflected in the revised draft export."
    )


def _build_suggestion(original_text: str, instruction: str) -> tuple[str, str]:
    clean_instruction = instruction.strip()

    suggested = original_text
    rationale = "Clause rewritten based on user instruction with a more balanced phrasing."

    if "liability" in clean_instruction.lower() or "cap" in clean_instruction.lower():
        suggested = (
            "Liability shall be limited to direct damages only, capped at the total fees paid under this "
            "agreement in the preceding 12 months. Neither party is liable for indirect or consequential damages."
        )
        rationale = "Added a standard liability cap and removed consequential damages exposure."
    elif "termination" in clean_instruction.lower():
        suggested = (
            "Either party may terminate this agreement with 30 days written notice. Immediate termination is "
            "allowed only for material breach if not cured within 15 days after notice."
        )
        rationale = "Balanced termination rights for both parties and introduced a cure period."
    elif "payment" in clean_instruction.lower():
        suggested = (
            "Invoices are due within 30 days of receipt. Delayed payment beyond 45 days accrues interest at a "
            "commercially reasonable rate."
        )
        rationale = "Improved payment predictability and added late-payment protection."
    else:
        suggested = (
            "Revised clause: "
            "This provision applies equally to both parties, uses commercially reasonable standards, and requires "
            "written notice with a fair cure period before enforcement actions."
        )

    return suggested, rationale


def _best_search_token(clause_text: str) -> str:
    normalized = re.sub(r"\s+", " ", clause_text or "").strip()
    if not normalized:
        return ""

    if ":" in normalized:
        left = normalized.split(":", 1)[0].strip()
        if 6 <= len(left) <= 80:
            return left

    token = normalized[:90]
    if len(token) > 40:
        token = token[:60]
    return token.strip()


def _render_text_to_pdf_bytes(title: str, body: str) -> bytes:
    doc = fitz.open()

    chunks = textwrap.wrap(body, width=105, replace_whitespace=False, break_long_words=False)
    lines = [title, ""] + chunks

    line_height = 14
    margin = 36
    max_lines_per_page = 50

    for start in range(0, len(lines), max_lines_per_page):
        page = doc.new_page()
        batch = lines[start : start + max_lines_per_page]
        y = margin
        for line in batch:
            page.insert_text((margin, y), line, fontsize=11)
            y += line_height

    data = doc.tobytes()
    doc.close()
    return data


def _require_session(session_id: str) -> _ReviewSession:
    session = REVIEW_SESSIONS.get(session_id)
    if session is None:
        raise KeyError("Review session not found.")
    return session


def _require_clause(session: _ReviewSession, clause_id: str) -> ReviewClause:
    for clause in session.clauses:
        if clause.clause_id == clause_id:
            return clause
    raise KeyError("Clause not found in this review session.")


def _to_response(session: _ReviewSession) -> ReviewSessionResponse:
    return ReviewSessionResponse(
        session_id=session.session_id,
        document_name=session.document_name,
        overall_risk=session.overall_risk,
        summary=session.summary,
        top_red_flags=session.top_red_flags,
        clauses=session.clauses,
    )
