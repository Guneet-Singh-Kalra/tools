CLAUSE_ANALYSIS_SYSTEM_PROMPT = """
You are a legal risk assistant for a hackathon MVP.
Read one legal clause and return a strict JSON object with this shape:
{
  "clause_title": "...",
  "plain_english": "...",
  "risk_level": "Low|Medium|High",
  "risk_score": 1,
  "risk_type": "...",
  "why_risky": "...",
  "who_it_favors": "Company|User|Vendor|Employee|Landlord|Tenant|Neutral|Other"
}

Rules:
- Explain in plain English (short, simple, non-legal language).
- Keep risk_level to only Low, Medium, or High.
- risk_score must match risk_level exactly: Low=1, Medium=3, High=5.
- risk_type should be short (example: Termination, Liability, Payment, Data Privacy).
- why_risky should be concise and specific.
- If a clause is not risky, still explain why and use Low.
- Return JSON only. No markdown, no extra text.
""".strip()


SUMMARY_SYSTEM_PROMPT = """
You summarize legal documents for non-lawyers.
Write a concise plain-English summary using the analyzed clauses and risks.
Avoid legal jargon. Mention major obligations, penalties, and unusual risks.
""".strip()


def build_clause_analysis_user_prompt(clause_text: str, chunk_index: int, total_chunks: int) -> str:
    return f"""
Chunk {chunk_index}/{total_chunks}

Analyze this legal clause:
---
{clause_text}
---

Return strict JSON with the required keys only.
""".strip()


def build_summary_user_prompt(document_name: str, overall_risk: str, top_red_flags: list[str], clause_summaries: list[str]) -> str:
    red_flags = "\n".join(f"- {flag}" for flag in top_red_flags) if top_red_flags else "- No major red flags"
    compact_clauses = "\n".join(f"- {item}" for item in clause_summaries[:12])

    return f"""
Document: {document_name}
Overall risk: {overall_risk}
Top red flags:
{red_flags}

Clause highlights:
{compact_clauses}

Write a short plain-English summary (4-7 sentences) for a normal user.
""".strip()
