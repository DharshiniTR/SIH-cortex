"""
main_api.py
------------
Exposes the FULL integrated pipeline (OCR stub -> Health check stub ->
Scheme Engine -> Alert trigger) as ONE API endpoint. This is what the
frontend team calls on document upload — they don't need to know about
OCR, health check, or scheme matching separately.

As each STUB in main_pipeline.py gets replaced with real logic by its
owner, this endpoint automatically starts returning real results —
nothing here needs to change.

Run:
    uvicorn main_api:app --reload --port 8000

Test:
    curl -X POST http://localhost:8000/documents/upload \
      -H "Content-Type: application/json" \
      -d '{"citizen_id": "citizen_001", "image_path": "/fake/path/income_certificate.jpg"}'
"""

from fastapi import FastAPI
from pydantic import BaseModel

from main_pipeline import process_document

app = FastAPI(title="SevaAlert Main Pipeline API", version="1.0.0")


class UploadRequest(BaseModel):
    citizen_id: str
    image_path: str  # in production: comes from file upload storage path


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "sevaalert_main_pipeline"}


@app.post("/documents/upload")
def upload_document(request: UploadRequest):
    """
    Single entry point for the whole pipeline. Returns document health
    AND scheme eligibility together, ready for the dashboard to render.
    """
    result = process_document(
        image_path=request.image_path,
        citizen_id=request.citizen_id,
    )
    return result
