from __future__ import annotations

from app.models.schemas import ClauseAnalysis


RISK_LEVEL_TO_SCORE = {
    "Low": 1,
    "Medium": 3,
    "High": 5,
}


def apply_risk_scoring(clauses: list[ClauseAnalysis]) -> list[ClauseAnalysis]:
    for clause in clauses:
        level = _normalize_level(clause.risk_level)
        clause.risk_level = level
        clause.risk_score = RISK_LEVEL_TO_SCORE[level]

    return clauses


def sort_clauses_by_risk(clauses: list[ClauseAnalysis]) -> list[ClauseAnalysis]:
    return sorted(clauses, key=lambda item: item.risk_score, reverse=True)


def derive_overall_risk(clauses: list[ClauseAnalysis]) -> str:
    if not clauses:
        return "Low"

    scores = [clause.risk_score for clause in clauses]
    avg_score = sum(scores) / len(scores)
    high_count = sum(1 for score in scores if score == 5)

    if avg_score >= 4 or high_count >= 2:
        return "High"
    if avg_score >= 2:
        return "Medium"
    return "Low"


def generate_top_red_flags(clauses: list[ClauseAnalysis], limit: int = 3) -> list[str]:
    risky = [clause for clause in clauses if clause.risk_score >= 3]
    source = risky if risky else clauses

    flags: list[str] = []
    for clause in source[:limit]:
        flag = f"{clause.clause_title}: {clause.why_risky}"
        flags.append(flag.strip())

    return flags


def _normalize_level(level: str) -> str:
    normalized = str(level).strip().lower()
    if normalized == "high":
        return "High"
    if normalized == "medium":
        return "Medium"
    return "Low"
