"""
api.py
------
Exposes the Scheme Engine as a standalone HTTP service, so the rest of
the team (OCR/health-check, frontend) can integrate with it over a
simple POST request instead of importing this module directly.

Run standalone:
    pip install fastapi uvicorn pydantic
    uvicorn api:app --reload --port 8001

Test it's alive:
    curl http://localhost:8001/health

Test the main endpoint:
    curl -X POST http://localhost:8001/scheme-status \
      -H "Content-Type: application/json" \
      -d '{
            "citizen_id": "test123",
            "documents": [
              {"doc_type": "income_certificate", "health": "warning", "days_left": 12},
              {"doc_type": "age_proof", "health": "ok", "days_left": 200}
            ],
            "profile": {"age": 65, "annual_income": 80000}
          }'
"""

from fastapi import FastAPI
from pydantic import BaseModel
from typing import Optional

from matcher import get_displayable_schemes
from message_builder import attach_messages

app = FastAPI(title="SevaAlert Scheme Engine Service", version="1.0.0")


# ---------- Request / response schemas ----------

class DocumentInput(BaseModel):
    doc_type: str
    health: str                      # "ok" | "warning" | "expired"
    days_left: Optional[int] = None


class ProfileInput(BaseModel):
    age: int
    annual_income: int


class SchemeCheckRequest(BaseModel):
    citizen_id: str
    documents: list[DocumentInput]
    profile: ProfileInput


# ---------- Endpoints ----------

@app.get("/health")
def health_check():
    """Quick liveness check — hit this first to confirm the service is up
    before wiring in the real integration."""
    return {"status": "ok", "service": "scheme_engine"}


@app.post("/scheme-status")
def scheme_status(request: SchemeCheckRequest):
    """
    Main integration point. Takes a citizen's documents + profile,
    returns their scheme eligibility sorted into three buckets, each
    entry pre-loaded with a ready-to-use citizen-facing message.
    """
    documents = [doc.dict() for doc in request.documents]
    profile = request.profile.dict()

    result = get_displayable_schemes(documents, profile)
    result = attach_messages(result)

    return {
        "citizen_id": request.citizen_id,
        **result,
    }
