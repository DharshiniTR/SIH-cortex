"""
message_builder.py
-------------------
Turns matcher.py's structured output into plain-language messages that
can be:
  - shown as text on the citizen dashboard
  - spoken aloud via Indic Parler-TTS for voice call alerts
  - sent as SMS text

Kept separate from matcher.py on purpose: matching logic and message
wording are different concerns, and this keeps the language-generation
piece swappable (e.g. multilingual templates) without touching the
eligibility logic.
"""


def build_alert_message(flagged_scheme: dict) -> str:
    """
    flagged_scheme: one entry from result["eligible_at_risk"], e.g.
        {
            "scheme_id": "old_age_pension",
            "scheme_name": "Old Age Pension Scheme",
            "flagged_docs": ["income_certificate"],
            "status": "expiring",
            "days_left": 12
        }
    """
    doc = flagged_scheme["flagged_docs"][0].replace("_", " ")
    name = flagged_scheme["scheme_name"]
    status = flagged_scheme["status"]

    if status == "expired":
        return (
            f"You qualify for {name}, but your {doc} has expired. "
            f"Please renew it at your nearest E-Sevai Maiyam to restore eligibility."
        )

    days_left = flagged_scheme.get("days_left")
    days_phrase = f"in {days_left} days" if days_left is not None else "soon"
    return (
        f"You're eligible for {name}, but your {doc} is expiring {days_phrase}. "
        f"Renew it soon to avoid losing this benefit."
    )


def build_missing_doc_message(potential_scheme: dict) -> str:
    """
    potential_scheme: one entry from result["potentially_eligible"], e.g.
        {
            "scheme_id": "student_scholarship",
            "scheme_name": "Educational Scholarship",
            "missing_docs": ["community_certificate"]
        }
    """
    docs = ", ".join(d.replace("_", " ") for d in potential_scheme["missing_docs"])
    name = potential_scheme["scheme_name"]
    return f"You may qualify for {name} — you're missing: {docs}."


def build_eligible_now_message(scheme: dict) -> str:
    """scheme: one entry from result["eligible_now"]"""
    return f"You're fully eligible for {scheme['scheme_name']}. No action needed."


def attach_messages(scheme_result: dict) -> dict:
    """
    Convenience function: takes matcher.py's raw output and attaches a
    ready-to-use "message" field to every entry in every bucket.
    This is what api.py calls before returning the response.
    """
    for item in scheme_result.get("eligible_at_risk", []):
        item["message"] = build_alert_message(item)

    for item in scheme_result.get("potentially_eligible", []):
        item["message"] = build_missing_doc_message(item)

    for item in scheme_result.get("eligible_now", []):
        item["message"] = build_eligible_now_message(item)

    return scheme_result
