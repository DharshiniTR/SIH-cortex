"""
main_pipeline.py
------------------
The single integration point for SevaAlert's core pipeline:

    Document Upload
        -> OCR (extract raw text)                     [STUB - Task 2 owner]
        -> NLP Field Extraction (structured fields)    [STUB - Task 2 owner]
        -> Health Check (ok/warning/expired)           [STUB - Task 2 owner]
        -> SCHEME ENGINE (real, working)                [DONE - this file wires it in]
        -> Alert Trigger (voice/SMS)                    [STUB - hook point shown]

Everything marked STUB is a clearly isolated function you can replace
with real logic without touching anything else in this file. The
Scheme Engine call and its input/output shape will not need to change.

Run this file directly to see the full pipeline execute end-to-end
using placeholder OCR/health-check output:

    python main_pipeline.py
"""

import sys
import os

# Make scheme_engine importable as a package
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "scheme_engine"))

from matcher import get_displayable_schemes
from message_builder import attach_messages


# =====================================================================
# STUB: OCR — replace with real Tesseract/pretrained model call
# =====================================================================
def run_ocr(image_path: str) -> str:
    """
    TODO (Task 2 owner): replace with real OCR call, e.g.
        result = pretrained_model.predict(preprocessed_image)
        return result.text
    """
    print(f"[STUB] Running OCR on {image_path} ...")
    return "Income Certificate\nName: Kamala Devi\nIssue Date: 10/01/2025\nExpiry Date: 05/09/2026"


# =====================================================================
# STUB: NLP field extraction — replace with real regex/spaCy parser
# =====================================================================
def parse_fields(raw_text: str) -> dict:
    """
    TODO (Task 2 owner): replace with real field extraction logic.
    Must return a dict with at least: doc_type, name, issue_date, expiry_date
    """
    print("[STUB] Parsing fields from OCR text ...")
    return {
        "doc_type": "income_certificate",
        "name": "Kamala Devi",
        "issue_date": "10/01/2025",
        "expiry_date": "05/09/2026",
    }


# =====================================================================
# STUB: Health check — replace with real date-math implementation
# =====================================================================
def check_health(fields: dict) -> dict:
    """
    TODO (Task 5 owner): replace with real implementation using
    datetime comparison against today's date, e.g.:

        from datetime import datetime
        expiry = datetime.strptime(fields['expiry_date'], "%d/%m/%Y")
        days_left = (expiry - datetime.now()).days
        ...

    Must return a dict with: health ("ok"/"warning"/"expired"), days_left
    """
    print("[STUB] Checking document health ...")
    return {
        "health": "warning",
        "days_left": 12,
    }


# =====================================================================
# STUB: Citizen profile lookup — replace with real DB / DigiLocker call
# =====================================================================
def get_citizen_profile(citizen_id: str) -> dict:
    """
    TODO (Task 1 owner): replace with real lookup, e.g. from your
    citizen_profile DB table populated via the DigiLocker consent flow.
    Must return a dict with: age, annual_income, phone_number (optional
    for scheme matching, required for alert triggering)
    """
    print(f"[STUB] Fetching profile for citizen {citizen_id} ...")
    return {
        "age": 65,
        "annual_income": 80000,
        "phone_number": "+91XXXXXXXXXX",
        "preferred_language": "Tamil",
        "consent_voice_call": True,
    }


def get_all_processed_documents(citizen_id: str) -> list[dict]:
    """
    TODO (Task 1/5 owner): replace with real DB query returning ALL of
    this citizen's previously processed documents, not just the one
    just uploaded — the Scheme Engine needs the full set.
    """
    print(f"[STUB] Fetching all documents for citizen {citizen_id} ...")
    return [
        {"doc_type": "income_certificate", "health": "warning", "days_left": 12},
        {"doc_type": "age_proof", "health": "ok", "days_left": 200},
    ]


# =====================================================================
# STUB: Alert trigger — replace with real Indic Parler-TTS + Twilio call
# =====================================================================
def trigger_alert(citizen_profile: dict, flagged_scheme: dict):
    """
    TODO (Task 2 owner): replace with real implementation:
        1. audio_path = generate_voice_alert(flagged_scheme["message"], language_hint=citizen_profile["preferred_language"])
        2. trigger_voice_call(citizen_profile["phone_number"], audio_path)
       Or fall back to SMS if consent_voice_call is False.
    """
    if not citizen_profile.get("consent_voice_call"):
        print(f"[STUB] Would send SMS to {citizen_profile['phone_number']}: {flagged_scheme['message']}")
        return
    print(f"[STUB] Would call {citizen_profile['phone_number']} and speak: \"{flagged_scheme['message']}\"")


# =====================================================================
# THE REAL, WORKING PART — Scheme Engine integration
# =====================================================================
def process_document(image_path: str, citizen_id: str) -> dict:
    """
    The full orchestrator. This is what your API endpoint should call
    on every document upload.
    """
    # 1. OCR
    raw_text = run_ocr(image_path)

    # 2. NLP field extraction
    fields = parse_fields(raw_text)

    # 3. Health check
    health = check_health(fields)

    document_result = {**fields, **health}
    print(f"\nDocument processed: {document_result}\n")

    # 4. SCHEME ENGINE — runs on citizen's FULL document set, not just this one
    all_documents = get_all_processed_documents(citizen_id)
    citizen_profile = get_citizen_profile(citizen_id)

    scheme_result = get_displayable_schemes(all_documents, citizen_profile)
    scheme_result = attach_messages(scheme_result)

    print("=" * 60)
    print("SCHEME ENGINE RESULTS")
    print("=" * 60)
    print(f"Eligible Now: {len(scheme_result['eligible_now'])}")
    for s in scheme_result["eligible_now"]:
        print(f"  [OK] {s['message']}")

    print(f"\nEligible but At Risk: {len(scheme_result['eligible_at_risk'])}")
    for s in scheme_result["eligible_at_risk"]:
        print(f"  [!!] {s['message']}")

    print(f"\nPotentially Eligible: {len(scheme_result['potentially_eligible'])}")
    for s in scheme_result["potentially_eligible"]:
        print(f"  [??] {s['message']}")
    print("=" * 60)

    # 5. ALERT TRIGGER — only for schemes flagged as at-risk
    for flagged in scheme_result["eligible_at_risk"]:
        trigger_alert(citizen_profile, flagged)

    return {
        "document": document_result,
        "schemes": scheme_result,
    }


if __name__ == "__main__":
    result = process_document(
        image_path="/fake/path/income_certificate.jpg",
        citizen_id="citizen_001",
    )
    print("\nPipeline finished. Final result object keys:", list(result.keys()))
