"""
Validation pass: flags low-confidence and missing fields for human review.
Adds/extends the `warnings` list on the result. Never rejects or discards
a value — just flags it, per spec ("flag low-confidence fields for human
verification", "do not simply discard values").
"""
from typing import Any, Dict, List

LOW_CONFIDENCE_THRESHOLD = 0.75
LOW_DOC_TYPE_CONFIDENCE_THRESHOLD = 0.5


def validate_result(result: Dict[str, Any]) -> Dict[str, Any]:
    warnings: List[str] = list(result.get("warnings", []))

    doc_type = result.get("document_type", {}) or {}
    doc_confidence = doc_type.get("confidence", 0) or 0
    if doc_confidence < LOW_DOC_TYPE_CONFIDENCE_THRESHOLD:
        warnings.append(
            f"Document type classification has low confidence ({doc_confidence:.2f}) "
            f"— verify manually."
        )

    fields = result.get("fields", {})
    for name, field in fields.items():
        if not isinstance(field, dict):
            continue

        confidence = field.get("confidence", 0) or 0
        value = field.get("value")

        if value in (None, "", "null"):
            field["needs_review"] = True
            warnings.append(f"'{name}' was not found or is empty.")
            continue

        if confidence < LOW_CONFIDENCE_THRESHOLD:
            field["needs_review"] = True
            warnings.append(f"'{name}' has low confidence ({confidence:.2f}) — needs manual review.")
        else:
            field.setdefault("needs_review", False)

    result["warnings"] = warnings
    return result
