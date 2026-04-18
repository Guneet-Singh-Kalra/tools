from __future__ import annotations

import re

import fitz


def extract_text_from_pdf_bytes(file_bytes: bytes) -> str:
    """Extract raw text from a PDF byte stream."""
    if not file_bytes:
        return ""

    pages_text: list[str] = []
    with fitz.open(stream=file_bytes, filetype="pdf") as doc:
        for page in doc:
            page_text = page.get_text("text")
            if page_text:
                pages_text.append(page_text)

    return "\n".join(pages_text)


def clean_legal_text(text: str) -> str:
    """Normalize whitespace and remove obvious OCR/newline noise."""
    if not text:
        return ""

    cleaned = text.replace("\r", "\n")
    cleaned = re.sub(r"[ \t]+", " ", cleaned)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    cleaned = re.sub(r"-\n", "", cleaned)
    cleaned = re.sub(r"\s+\n", "\n", cleaned)

    return cleaned.strip()
