"""
Schema for the final SEVAALERT result JSON. Deliberately permissive
(extra="allow" everywhere) — the spec requires preserving ANY meaningful
field a document contains, not just a fixed list, so this is used for
lightweight sanity-checking only, never to reject or strip data.
"""
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict


class FieldValue(BaseModel):
    model_config = ConfigDict(extra="allow")

    value: Any = None
    confidence: float = 0.0
    source_text: Optional[str] = None
    page: Optional[int] = None
    original_value: Optional[Any] = None
    normalized_value: Optional[Any] = None
    currency: Optional[str] = None
    needs_review: Optional[bool] = None


class DocumentTypeValue(BaseModel):
    value: str = "unknown"
    confidence: float = 0.0


class Validity(BaseModel):
    model_config = ConfigDict(extra="allow")

    valid_from: Optional[str] = None
    expiry_date: Optional[str] = None
    status: Optional[str] = None


class DocumentResult(BaseModel):
    model_config = ConfigDict(extra="allow")

    document_type: DocumentTypeValue
    fields: Dict[str, FieldValue] = {}
    validity: Optional[Validity] = None
    warnings: List[str] = []
