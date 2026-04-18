from __future__ import annotations

import json
import os
import re
from typing import Any

from dotenv import load_dotenv
from openai import OpenAI

from app.models.schemas import ClauseAnalysis
from app.prompts.legal_prompts import (
    CLAUSE_ANALYSIS_SYSTEM_PROMPT,
    build_clause_analysis_user_prompt,
)


load_dotenv()


DEFAULT_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")


def analyze_clauses_with_llm(chunks: list[str]) -> list[ClauseAnalysis]:
    analyses: list[ClauseAnalysis] = []
    total = len(chunks)

    for idx, chunk in enumerate(chunks, start=1):
        analyses.append(analyze_clause_with_llm(chunk, idx, total))

    return analyses


def analyze_clause_with_llm(clause_text: str, chunk_index: int, total_chunks: int) -> ClauseAnalysis:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY is not set.")

    client = OpenAI(api_key=api_key)
    user_prompt = build_clause_analysis_user_prompt(clause_text, chunk_index, total_chunks)

    response = client.chat.completions.create(
        model=DEFAULT_MODEL,
        temperature=0,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": CLAUSE_ANALYSIS_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
    )

    raw = response.choices[0].message.content or "{}"
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
