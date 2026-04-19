"""
README (Quick Start)
1) cd backend
2) python -m venv .venv && source .venv/bin/activate
3) pip install -r requirements.txt
4) cp .env.example .env and set GEMINI_API_KEY
5) uvicorn main:app --reload --port 8000

API docs: http://localhost:8000/docs
"""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from app.routes.analyze import router as analyze_router
from app.routes.review import router as review_router


load_dotenv()

app = FastAPI(title="Legal Document Simplifier API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(analyze_router)
app.include_router(review_router)
