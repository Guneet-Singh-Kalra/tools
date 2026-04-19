from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import BaseModel, Field


RiskLevel = Literal["Low", "Medium", "High"]


class ClauseAnalysis(BaseModel):
    clause_title: str = Field(default="Untitled Clause")
    plain_english: str = Field(default="No explanation available.")
    plain_hindi: Optional[str] = Field(default=None)
    risk_level: RiskLevel = Field(default="Low")
    risk_score: int = Field(default=1)
    risk_type: str = Field(default="General")
    why_risky: str = Field(default="No clear risk identified.")
    who_it_favors: str = Field(default="Neutral")


class AnalyzeResponse(BaseModel):
    document_name: str
    overall_risk: RiskLevel
    summary: str
    summary_hindi: Optional[str] = None
    top_red_flags: List[str]
    clauses: List[ClauseAnalysis]


class AnalyzeTextRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Plain legal text to analyze.")
    document_name: str = Field(default="text_input")


DecisionType = Literal["accept", "decline"]
ClauseStatus = Literal["pending", "accepted", "declined"]


class ReviewClause(BaseModel):
    clause_id: str
    clause_title: str = Field(default="Untitled Clause")
    plain_english: str = Field(default="No explanation available.")
    plain_hindi: Optional[str] = Field(default=None)
    risk_level: RiskLevel = Field(default="Low")
    risk_score: int = Field(default=1)
    risk_type: str = Field(default="General")
    why_risky: str = Field(default="No clear risk identified.")
    who_it_favors: str = Field(default="Neutral")
    original_text: str = Field(default="")
    suggested_text: Optional[str] = None
    suggestion_reason: Optional[str] = None
    suggestion_instruction: Optional[str] = None
    status: ClauseStatus = Field(default="pending")


class ReviewSessionResponse(BaseModel):
    session_id: str
    document_name: str
    overall_risk: RiskLevel
    summary: str
    summary_hindi: Optional[str] = None
    top_red_flags: List[str]
    clauses: List[ReviewClause]


class ClauseSuggestionRequest(BaseModel):
    instruction: str = Field(..., min_length=1, description="How user wants this clause improved.")


class ClauseDecisionRequest(BaseModel):
    decision: DecisionType
    custom_text: Optional[str] = Field(
        default=None,
        description="Optional final clause text for accept decision.",
    )


class ReviewTextRequest(BaseModel):
    text: str = Field(..., min_length=1)
    document_name: str = Field(default="text_input")


class ClauseComparison(BaseModel):
    clause_id: str
    clause_title: str
    status: ClauseStatus
    changed: bool
    similarity: float = Field(description="Text similarity between original and revised clause, from 0 to 1.")
    suggestion_instruction: Optional[str] = None
    original_text: str
    revised_text: str
    change_summary: str


class ContractComparisonResponse(BaseModel):
    session_id: str
    document_name: str
    total_clauses: int
    changed_clauses: int
    accepted_changes: int
    declined_changes: int
    pending_suggestions: int
    original_contract_text: str
    revised_contract_text: str
    unified_diff: str
    clauses: List[ClauseComparison]
