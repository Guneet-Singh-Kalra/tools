from __future__ import annotations

import json
import os
import re
from typing import Any

from dotenv import load_dotenv
from google import genai
from google.genai import types

from app.prompts.legal_prompts import (
    HINDI_LOCALIZATION_SYSTEM_PROMPT,
    build_hindi_localization_user_prompt,
)


load_dotenv()


DEFAULT_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")


def localize_summary_and_clauses_to_hindi(summary: str, clause_explanations: list[str]) -> tuple[str | None, list[str | None]]:
    if not summary and not clause_explanations:
        return None, []

    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        return None, [None for _ in clause_explanations]

    client = genai.Client(api_key=api_key)
    prompt = build_hindi_localization_user_prompt(summary, clause_explanations)

    try:
        response = client.models.generate_content(
            model=DEFAULT_MODEL,
            contents=f"{HINDI_LOCALIZATION_SYSTEM_PROMPT}\n\n{prompt}",
            config=types.GenerateContentConfig(
                temperature=0,
                response_mime_type="application/json",
            ),
        )
    except Exception:
        return None, [None for _ in clause_explanations]

    raw = _extract_response_text(response) or "{}"
    parsed = _safe_json_parse(raw)

    summary_hindi = _as_optional_text(parsed.get("summary_hindi"))
    clauses_hindi_raw = parsed.get("clauses_hindi")
    clauses_hindi = _normalize_hindi_clause_list(clauses_hindi_raw, len(clause_explanations))
    return summary_hindi, clauses_hindi


def translate_text_to_hindi(text: str) -> str | None:
    if not text.strip():
        return None

    summary_hindi, _ = localize_summary_and_clauses_to_hindi(text, [])
    return summary_hindi


def _normalize_hindi_clause_list(value: Any, target_len: int) -> list[str | None]:
    out: list[str | None] = []
    if isinstance(value, list):
        for item in value[:target_len]:
            out.append(_as_optional_text(item))

    while len(out) < target_len:
        out.append(None)

    return out


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


def _as_optional_text(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text if text else None
