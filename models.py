from pydantic import BaseModel
from typing import List, Optional


class SchemeCertRequirement(BaseModel):
    scheme_name: str
    additional_certs_required: List[str]


class ReminderRequest(BaseModel):
    citizen_name: str
    phone_number: str            # E.164 format e.g. +91XXXXXXXXXX
    certificate_type: str        # e.g. "Income Certificate"
    expiry_date: str             # ISO format YYYY-MM-DD
    days_remaining: int
    language: str                # "ta", "te", "kn", "hi", "en" etc.
    latitude: float
    longitude: float
    eligible_schemes: Optional[List[SchemeCertRequirement]] = []


class ReminderResponse(BaseModel):
    status: str
    audio_url: str
    nearest_center: dict
    call_sid: Optional[str] = None
