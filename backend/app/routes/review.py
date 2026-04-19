from __future__ import annotations

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import Response

from app.models.schemas import (
    ClauseDecisionRequest,
    ClauseSuggestionRequest,
    ReviewSessionResponse,
    ReviewTextRequest,
)
from app.services.review_workflow import (
    apply_clause_decision,
    build_revised_pdf,
    build_risk_highlight_pdf,
    create_review_session_from_pdf,
    create_review_session_from_text,
    get_review_session,
    suggest_clause_change,
)


router = APIRouter(prefix="/review", tags=["review"])


@router.post("/analyze", response_model=ReviewSessionResponse)
async def analyze_for_review(file: UploadFile = File(...)) -> ReviewSessionResponse:
    filename = file.filename or "uploaded_document.pdf"
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Please upload a PDF file.")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        return create_review_session_from_pdf(file_bytes=file_bytes, document_name=filename)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Failed to create review session: {exc}") from exc


@router.post("/analyze-text", response_model=ReviewSessionResponse)
async def analyze_text_for_review(payload: ReviewTextRequest) -> ReviewSessionResponse:
    try:
        return create_review_session_from_text(payload.text, payload.document_name)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Failed to create review session: {exc}") from exc


@router.get("/{session_id}", response_model=ReviewSessionResponse)
def fetch_review_session(session_id: str) -> ReviewSessionResponse:
    try:
        return get_review_session(session_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/{session_id}/clauses/{clause_id}/suggest", response_model=ReviewSessionResponse)
def suggest_clause_update(
    session_id: str,
    clause_id: str,
    payload: ClauseSuggestionRequest,
) -> ReviewSessionResponse:
    try:
        return suggest_clause_change(session_id=session_id, clause_id=clause_id, payload=payload)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Failed to suggest clause update: {exc}") from exc


@router.post("/{session_id}/clauses/{clause_id}/decision", response_model=ReviewSessionResponse)
def decide_clause_update(
    session_id: str,
    clause_id: str,
    payload: ClauseDecisionRequest,
) -> ReviewSessionResponse:
    try:
        return apply_clause_decision(session_id=session_id, clause_id=clause_id, payload=payload)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Failed to apply clause decision: {exc}") from exc


@router.get("/{session_id}/pdf/original-highlighted")
def download_highlighted_pdf(session_id: str) -> Response:
    try:
        pdf_bytes = build_risk_highlight_pdf(session_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Could not generate highlighted PDF: {exc}") from exc

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename={session_id}_highlighted.pdf"},
    )


@router.get("/{session_id}/pdf/revised")
def download_revised_pdf(session_id: str) -> Response:
    try:
        pdf_bytes = build_revised_pdf(session_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Could not generate revised PDF: {exc}") from exc

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={session_id}_revised.pdf"},
    )
