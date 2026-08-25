"""
Light post-processing AFTER Qwen's semantic extraction — never the primary
extraction mechanism. Only cleans up formatting (date parsing, numeric
income) without changing WHAT was extracted. Original values are always
preserved alongside normalized ones.
"""
import re
from datetime import datetime
from typing import Any, Dict

_DATE_FORMATS = ["%d/%m/%Y", "%d-%m-%Y", "%Y-%m-%d", "%Y/%m/%d", "%d %B %Y", "%d %b %Y"]


def _try_parse_date(value: str):
    if not value or not isinstance(value, str):
        return None
    value = value.strip()
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(value, fmt).date().isoformat()
        except ValueError:
            continue
    try:
        from dateutil import parser as dateutil_parser
        return dateutil_parser.parse(value, dayfirst=True, fuzzy=True).date().isoformat()
    except Exception:
        return None


def _normalize_income(value: Any):
    if isinstance(value, (int, float)):
        return value
    if not isinstance(value, str):
        return value

    # Pull out the actual number run (digits, optional thousands-commas,
    # optional decimal part) rather than stripping non-digits from the whole
    # string — that previously let a stray "." from a currency abbreviation
    # like "Rs." leak into the parsed number (e.g. "Rs. 96,000" -> 0.96
    # instead of 96000).
    match = re.search(r"\d[\d,]*(?:\.\d+)?", value)
    if not match:
        return value
    cleaned = match.group(0).replace(",", "")
    try:
        return float(cleaned) if "." in cleaned else int(cleaned)
    except ValueError:
        return value


def normalize_result(result: Dict[str, Any]) -> Dict[str, Any]:
    fields = result.get("fields", {})
    for name, field in fields.items():
        if not isinstance(field, dict):
            continue
        value = field.get("value")
        if value is None:
            continue

        if name == "annual_income":
            normalized = _normalize_income(value)
            if normalized != value:
                field["original_value"] = value
                field["normalized_value"] = normalized
                field["value"] = normalized
            field.setdefault("currency", "INR")

        elif "date" in name and isinstance(value, str):
            parsed = _try_parse_date(value)
            if parsed and parsed != value:
                field["original_value"] = value
                field["normalized_value"] = parsed
                field["value"] = parsed

    validity = result.get("validity") or {}
    for key in ("valid_from", "expiry_date"):
        v = validity.get(key)
        if isinstance(v, str):
            parsed = _try_parse_date(v)
            if parsed:
                validity[key] = parsed
    result["validity"] = validity

    return result
