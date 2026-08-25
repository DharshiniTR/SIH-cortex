"""
Expiry / validity engine. Computes a status from the expiry_date Qwen
extracted — never invents an expiry date, and never assumes every
certificate has one (spec: "Do not assume every certificate has an expiry
date. Do not invent expiry dates.").
"""
from datetime import date, datetime, timedelta
from typing import Any, Dict

EXPIRING_SOON_WINDOW_DAYS = 30


def compute_validity_status(result: Dict[str, Any]) -> Dict[str, Any]:
    validity = result.get("validity") or {}
    expiry_str = validity.get("expiry_date")

    if not expiry_str:
        validity["status"] = "unknown"
        result["validity"] = validity
        return result

    try:
        expiry_date = datetime.strptime(expiry_str, "%Y-%m-%d").date()
    except (ValueError, TypeError):
        validity["status"] = "unknown"
        result["validity"] = validity
        return result

    today = date.today()
    if expiry_date < today:
        status = "expired"
    elif expiry_date <= today + timedelta(days=EXPIRING_SOON_WINDOW_DAYS):
        status = "expiring_soon"
    else:
        status = "valid"

    validity["status"] = status
    result["validity"] = validity
    return result
