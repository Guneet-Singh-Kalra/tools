from __future__ import annotations

from typing import List, Literal

from pydantic import BaseModel, Field


RiskLevel = Literal["Low", "Medium", "High"]


class ClauseAnalysis(BaseModel):
    clause_title: str = Field(default="Untitled Clause")
    plain_english: str = Field(default="No explanation available.")
    risk_level: RiskLevel = Field(default="Low")
    risk_score: int = Field(default=1)
    risk_type: str = Field(default="General")
    why_risky: str = Field(default="No clear risk identified.")
    who_it_favors: str = Field(default="Neutral")


class AnalyzeResponse(BaseModel):
    document_name: str
    overall_risk: RiskLevel
    summary: str
    top_red_flags: List[str]
    clauses: List[ClauseAnalysis]


class AnalyzeTextRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Plain legal text to analyze.")
    document_name: str = Field(default="text_input")
