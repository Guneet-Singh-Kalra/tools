from __future__ import annotations

from fastapi import APIRouter, File, HTTPException, Query, UploadFile

from app.models.schemas import AnalyzeResponse, AnalyzeTextRequest
from app.services.chunker import chunk_legal_text
from app.services.llm_analyzer import analyze_clauses_with_llm
from app.services.localization import localize_summary_and_clauses_to_hindi
from app.services.pdf_parser import clean_legal_text, extract_text_from_pdf_bytes
from app.services.risk_engine import (
    apply_risk_scoring,
    derive_overall_risk,
    generate_top_red_flags,
    sort_clauses_by_risk,
)
from app.services.summarizer import generate_document_summary


router = APIRouter(tags=["analysis"])


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_document(
    file: UploadFile = File(...),
    include_hindi: bool = Query(default=False, description="Include Hindi localization fields in response."),
) -> AnalyzeResponse:
    filename = file.filename or "uploaded_document.pdf"
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Please upload a PDF file.")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        raw_text = extract_text_from_pdf_bytes(file_bytes)
        cleaned_text = clean_legal_text(raw_text)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Could not parse PDF: {exc}") from exc

    if not cleaned_text:
        raise HTTPException(status_code=400, detail="No readable text found in this PDF.")

    return _analyze_text_pipeline(cleaned_text, filename, include_hindi=include_hindi)


@router.post("/analyze-text", response_model=AnalyzeResponse)
async def analyze_text(
    payload: AnalyzeTextRequest,
    include_hindi: bool = Query(default=False, description="Include Hindi localization fields in response."),
) -> AnalyzeResponse:
    cleaned_text = clean_legal_text(payload.text)
    if not cleaned_text:
        raise HTTPException(status_code=400, detail="Input text is empty after cleaning.")

    return _analyze_text_pipeline(cleaned_text, payload.document_name, include_hindi=include_hindi)


def _analyze_text_pipeline(text: str, document_name: str, include_hindi: bool = False) -> AnalyzeResponse:
    chunks = chunk_legal_text(text)
    if not chunks:
        raise HTTPException(status_code=400, detail="Could not split document into clauses.")

    try:
        clauses = analyze_clauses_with_llm(chunks)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"LLM analysis failed: {exc}") from exc

    scored_clauses = apply_risk_scoring(clauses)
    sorted_clauses = sort_clauses_by_risk(scored_clauses)
    overall_risk = derive_overall_risk(sorted_clauses)
    top_red_flags = generate_top_red_flags(sorted_clauses)
    summary = generate_document_summary(
        document_name=document_name,
        clauses=sorted_clauses,
        overall_risk=overall_risk,
        top_red_flags=top_red_flags,
    )
    summary_hindi = None

    if include_hindi:
        summary_hindi, clause_hindi = localize_summary_and_clauses_to_hindi(
            summary,
            [clause.plain_english for clause in sorted_clauses],
        )
        for clause, plain_hindi in zip(sorted_clauses, clause_hindi):
            clause.plain_hindi = plain_hindi

    return AnalyzeResponse(
        document_name=document_name,
        overall_risk=overall_risk,
        summary=summary,
        summary_hindi=summary_hindi,
        top_red_flags=top_red_flags,
        clauses=sorted_clauses,
    )
