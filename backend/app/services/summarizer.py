from __future__ import annotations

import os

from dotenv import load_dotenv
from openai import OpenAI

from app.models.schemas import ClauseAnalysis
from app.prompts.legal_prompts import SUMMARY_SYSTEM_PROMPT, build_summary_user_prompt


load_dotenv()


DEFAULT_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")


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

    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return _fallback_summary(document_name, overall_risk, top_red_flags)

    client = OpenAI(api_key=api_key)
    prompt = build_summary_user_prompt(document_name, overall_risk, top_red_flags, clause_summaries)

    try:
        response = client.chat.completions.create(
            model=DEFAULT_MODEL,
            temperature=0.2,
            messages=[
                {"role": "system", "content": SUMMARY_SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
        )
        summary = (response.choices[0].message.content or "").strip()
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
