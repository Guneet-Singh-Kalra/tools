from __future__ import annotations

import json
import os
import re
from typing import Any

from dotenv import load_dotenv
from google import genai
from google.genai import types

from app.models.schemas import ClauseAnalysis
from app.prompts.legal_prompts import (
    CLAUSE_ANALYSIS_SYSTEM_PROMPT,
    build_clause_analysis_user_prompt,
)


load_dotenv()


DEFAULT_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
MOCK_LLM = os.getenv("MOCK_LLM", "false").strip().lower() == "true"
LLM_FALLBACK_TO_MOCK = os.getenv("LLM_FALLBACK_TO_MOCK", "true").strip().lower() == "true"


def analyze_clauses_with_llm(chunks: list[str]) -> list[ClauseAnalysis]:
    analyses: list[ClauseAnalysis] = []
    total = len(chunks)

    for idx, chunk in enumerate(chunks, start=1):
        if MOCK_LLM:
            analyses.append(analyze_clause_with_mock(chunk, idx))
            continue

        try:
            analyses.append(analyze_clause_with_llm(chunk, idx, total))
        except Exception:
            if not LLM_FALLBACK_TO_MOCK:
                raise
            analyses.append(analyze_clause_with_mock(chunk, idx))

    return analyses


def analyze_clause_with_llm(clause_text: str, chunk_index: int, total_chunks: int) -> ClauseAnalysis:
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY (or GOOGLE_API_KEY) is not set.")

    client = genai.Client(api_key=api_key)
    user_prompt = build_clause_analysis_user_prompt(clause_text, chunk_index, total_chunks)

    response = client.models.generate_content(
        model=DEFAULT_MODEL,
        contents=f"{CLAUSE_ANALYSIS_SYSTEM_PROMPT}\n\n{user_prompt}",
        config=types.GenerateContentConfig(
            temperature=0,
            response_mime_type="application/json",
        ),
    )

    raw = _extract_response_text(response) or "{}"
    parsed = _safe_json_parse(raw)

    return ClauseAnalysis(
        clause_title=_as_text(parsed.get("clause_title"), fallback=f"Clause {chunk_index}"),
        plain_english=_as_text(parsed.get("plain_english"), fallback="No explanation available."),
        risk_level=_normalize_risk_level(_as_text(parsed.get("risk_level"), fallback="Low")),
        risk_score=_normalize_risk_score(parsed.get("risk_score"), parsed.get("risk_level")),
        risk_type=_as_text(parsed.get("risk_type"), fallback="General"),
        why_risky=_as_text(parsed.get("why_risky"), fallback="No clear risk identified."),
        who_it_favors=_as_text(parsed.get("who_it_favors"), fallback="Neutral"),
    )


def analyze_clause_with_mock(clause_text: str, chunk_index: int) -> ClauseAnalysis:
    text = clause_text.strip()
    text_lower = text.lower()

    clause_title = _extract_clause_title(text, chunk_index)
    plain_english = _to_plain_english(text)

    risk_score = 1
    risk_type = "General"
    reasons: list[str] = []
    who_it_favors = "Neutral"

    if any(k in text_lower for k in ["terminate", "termination", "without notice", "sole discretion"]):
        risk_score = 5
        risk_type = "Termination"
        who_it_favors = "Company"
        reasons.append("Allows one-sided termination or broad discretionary termination rights")

    if any(k in text_lower for k in ["indirect", "consequential", "no cap", "unlimited liability", "liable for any"]):
        risk_score = 5
        risk_type = "Liability"
        who_it_favors = "Company"
        reasons.append("Creates broad or uncapped liability exposure")

    if any(k in text_lower for k in ["delay", "delayed", "120 days", "late payment", "withhold payment"]):
        risk_score = max(risk_score, 3)
        if risk_type == "General":
            risk_type = "Payment"
        if who_it_favors == "Neutral":
            who_it_favors = "Company"
        reasons.append("Payment timing is one-sided or heavily delayed")

    if any(k in text_lower for k in ["indemn", "hold harmless", "defend and indemnify"]):
        risk_score = 5
        risk_type = "Indemnity"
        who_it_favors = "Company"
        reasons.append("Shifts legal and financial risk through indemnity obligations")

    if any(k in text_lower for k in ["governing law", "jurisdiction", "venue"]):
        risk_score = max(risk_score, 3)
        if risk_type == "General":
            risk_type = "Jurisdiction"
        reasons.append("Dispute venue or governing law may disadvantage one party")

    risk_level = _risk_level_from_score(risk_score)
    why_risky = "; ".join(reasons) if reasons else "No major one-sided risk pattern detected by the offline analyzer."

    return ClauseAnalysis(
        clause_title=clause_title,
        plain_english=plain_english,
        risk_level=risk_level,
        risk_score=risk_score,
        risk_type=risk_type,
        why_risky=why_risky,
        who_it_favors=who_it_favors,
    )


def _extract_clause_title(text: str, chunk_index: int) -> str:
    first_line = text.splitlines()[0].strip() if text else ""

    numbered = re.match(r"^\s*\d+[\).\s-]*([^:\n]{2,80})", first_line)
    if numbered:
        title = numbered.group(1).strip(" .:-")
        if title:
            return title.title()

    heading = re.match(r"^([A-Z][A-Z\s\-/]{3,80})$", first_line)
    if heading:
        return heading.group(1).strip().title()

    if ":" in first_line:
        left = first_line.split(":", 1)[0].strip(" .-")
        if 2 <= len(left) <= 80:
            return left.title()

    return f"Clause {chunk_index}"


def _to_plain_english(text: str, max_len: int = 220) -> str:
    if not text:
        return "No explanation available."

    compact = re.sub(r"\s+", " ", text).strip()
    if len(compact) <= max_len:
        return compact

    cut = compact[: max_len - 3]
    last_space = cut.rfind(" ")
    if last_space > 40:
        cut = cut[:last_space]
    return f"{cut}..."


def _risk_level_from_score(score: int) -> str:
    if score >= 5:
        return "High"
    if score >= 3:
        return "Medium"
    return "Low"


def _extract_response_text(response: Any) -> str:
    try:
        text = (response.text or "").strip()
        if text:
            return text
    except Exception:
        pass

    candidates = getattr(response, "candidates", None) or []
    for candidate in candidates:
        content = getattr(candidate, "content", None)
        parts = getattr(content, "parts", None) or []
        for part in parts:
            text = getattr(part, "text", None)
            if text:
                return str(text).strip()

    return ""


def _safe_json_parse(text: str) -> dict[str, Any]:
    try:
        value = json.loads(text)
        return value if isinstance(value, dict) else {}
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, flags=re.DOTALL)
        if not match:
            return {}
        try:
            value = json.loads(match.group(0))
            return value if isinstance(value, dict) else {}
        except json.JSONDecodeError:
            return {}


def _as_text(value: Any, fallback: str) -> str:
    if value is None:
        return fallback
    text = str(value).strip()
    return text if text else fallback


def _normalize_risk_level(level: str) -> str:
    normalized = level.strip().lower()
    if normalized == "high":
        return "High"
    if normalized == "medium":
        return "Medium"
    return "Low"


def _normalize_risk_score(score_value: Any, risk_level_value: Any) -> int:
    level = _normalize_risk_level(_as_text(risk_level_value, fallback="Low"))
    level_map = {"Low": 1, "Medium": 3, "High": 5}

    try:
        score = int(score_value)
    except (TypeError, ValueError):
        score = level_map[level]

    if score <= 1:
        return 1
    if score <= 3:
        return 3
    return 5
