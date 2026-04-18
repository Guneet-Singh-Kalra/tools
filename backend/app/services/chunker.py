from __future__ import annotations

import re


CLAUSE_HEADING_SPLIT = re.compile(
    r"\n(?=(?:\d{1,2}(?:\.\d+){0,3}[\.)]?\s+[A-Z][^\n]{2,120}|[A-Z][A-Z\s\-/]{5,80}\n))"
)


def chunk_legal_text(text: str, max_chunk_chars: int = 1800, min_chunk_chars: int = 250) -> list[str]:
    """Split legal text into clause-like chunks and merge tiny fragments."""
    if not text:
        return []

    candidate_chunks = [part.strip() for part in CLAUSE_HEADING_SPLIT.split(text) if part.strip()]
    if len(candidate_chunks) <= 1:
        candidate_chunks = [part.strip() for part in text.split("\n\n") if part.strip()]

    sized_chunks: list[str] = []
    for chunk in candidate_chunks:
        if len(chunk) <= max_chunk_chars:
            sized_chunks.append(chunk)
            continue

        start = 0
        while start < len(chunk):
            end = min(start + max_chunk_chars, len(chunk))
            segment = chunk[start:end]

            if end < len(chunk):
                last_period = segment.rfind(". ")
                last_newline = segment.rfind("\n")
                split_at = max(last_period, last_newline)
                if split_at > max_chunk_chars // 2:
                    end = start + split_at + 1
                    segment = chunk[start:end]

            sized_chunks.append(segment.strip())
            start = end

    return _merge_short_chunks(sized_chunks, min_chunk_chars=min_chunk_chars)


def _merge_short_chunks(chunks: list[str], min_chunk_chars: int) -> list[str]:
    if not chunks:
        return []

    merged: list[str] = []
    buffer = ""

    for chunk in chunks:
        candidate = f"{buffer}\n\n{chunk}".strip() if buffer else chunk
        if len(candidate) < min_chunk_chars:
            buffer = candidate
            continue

        merged.append(candidate)
        buffer = ""

    if buffer:
        if merged:
            merged[-1] = f"{merged[-1]}\n\n{buffer}".strip()
        else:
            merged.append(buffer)

    return merged
