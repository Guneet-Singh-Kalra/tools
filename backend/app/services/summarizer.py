from __future__ import annotations

import os

from dotenv import load_dotenv
from google import genai
from google.genai import types

from app.models.schemas import ClauseAnalysis
from app.prompts.legal_prompts import SUMMARY_SYSTEM_PROMPT, build_summary_user_prompt


load_dotenv()


DEFAULT_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")


def generate_document_summary(
    document_name: str,
    clauses: list[ClauseAnalysis],
    overall_risk: str,
    top_red_flags: list[str],
) -> str:
    clause_summaries = [
        f"{clause.clause_title} ({clause.risk_level}): {clause.plain_english}"
        for clause in clauses[:20]
    ]

    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        return _fallback_summary(document_name, overall_risk, top_red_flags)

    client = genai.Client(api_key=api_key)
    prompt = build_summary_user_prompt(document_name, overall_risk, top_red_flags, clause_summaries)

    try:
        response = client.models.generate_content(
            model=DEFAULT_MODEL,
            contents=f"{SUMMARY_SYSTEM_PROMPT}\n\n{prompt}",
            config=types.GenerateContentConfig(
                temperature=0.2,
            ),
        )
        summary = _extract_response_text(response)
        if summary:
            return summary
    except Exception:
        pass

    return _fallback_summary(document_name, overall_risk, top_red_flags)


def _fallback_summary(document_name: str, overall_risk: str, top_red_flags: list[str]) -> str:
    if not top_red_flags:
        return (
            f"{document_name} was analyzed with an overall {overall_risk} risk rating. "
            "No major red flags were detected in the extracted text."
        )

    top_points = "; ".join(top_red_flags[:3])
    return (
        f"{document_name} was analyzed with an overall {overall_risk} risk rating. "
        f"Key concerns include: {top_points}."
    )


def _extract_response_text(response: object) -> str:
    try:
        text = (response.text or "").strip()  # type: ignore[attr-defined]
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
