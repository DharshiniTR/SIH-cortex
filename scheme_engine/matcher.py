"""
matcher.py
----------
Core Scheme Engine logic.

Pure function design on purpose: no database calls, no API calls, no
imports from OCR/health-check modules. It only operates on plain Python
dicts/lists. This is what makes the module independently testable and
safe to build in parallel with the rest of the team's work.

Decision logic per scheme, in order:
  1. Profile gate   -> age / income eligibility
  2. Presence gate  -> are all required documents present at all?
  3. Health gate    -> are the present documents valid (not expired/expiring)?

Buckets returned:
  - eligible_now         : fully eligible, no action needed
  - eligible_at_risk      : eligible, but a required doc is expired/expiring soon
  - potentially_eligible  : profile matches, but a required doc is missing
"""

from scheme_rules import get_all_schemes


def get_displayable_schemes(citizen_documents: list[dict], citizen_profile: dict) -> dict:
    """
    citizen_documents: list of dicts, each like:
        {"doc_type": "income_certificate", "health": "ok" | "warning" | "expired", "days_left": int}
    citizen_profile: dict like:
        {"age": 65, "annual_income": 80000}

    Returns:
        {
            "eligible_now": [...],
            "eligible_at_risk": [...],
            "potentially_eligible": [...]
        }
    """
    doc_map = {d["doc_type"]: d for d in citizen_documents}
    schemes = get_all_schemes()

    eligible_now = []
    eligible_at_risk = []
    potentially_eligible = []

    for scheme_id, scheme in schemes.items():
        elig = scheme.get("eligibility", {})

        # --- Gate 1: profile eligibility (cheap filter, run first) ---
        if "min_age" in elig and citizen_profile.get("age", 0) < elig["min_age"]:
            continue
        if "max_age" in elig and citizen_profile.get("age", 999) > elig["max_age"]:
            continue
        if "max_income" in elig and citizen_profile.get("annual_income", 0) > elig["max_income"]:
            continue

        required = scheme["required_docs"]

        # --- Gate 2: document presence ---
        missing = [d for d in required if d not in doc_map]
        if missing:
            potentially_eligible.append({
                "scheme_id": scheme_id,
                "scheme_name": scheme["name"],
                "missing_docs": missing,
            })
            continue

        # --- Gate 3: document health (all required docs ARE present here) ---
        expired = [d for d in required if doc_map[d]["health"] == "expired"]
        expiring = [d for d in required if doc_map[d]["health"] == "warning"]

        if expired or expiring:
            flagged = expired or expiring
            days_left_values = [
                doc_map[d].get("days_left") for d in flagged if doc_map[d].get("days_left") is not None
            ]
            eligible_at_risk.append({
                "scheme_id": scheme_id,
                "scheme_name": scheme["name"],
                "flagged_docs": flagged,
                "status": "expired" if expired else "expiring",
                "days_left": min(days_left_values) if days_left_values else None,
            })
        else:
            eligible_now.append({
                "scheme_id": scheme_id,
                "scheme_name": scheme["name"],
            })

    return {
        "eligible_now": eligible_now,
        "eligible_at_risk": eligible_at_risk,
        "potentially_eligible": potentially_eligible,
    }
