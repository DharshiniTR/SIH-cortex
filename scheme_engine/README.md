# Scheme Engine

Standalone module that matches a citizen's documents + profile against
government welfare schemes, and sorts results into what they qualify
for now, what's at risk due to expiring/expired documents, and what
they could qualify for if they add a missing document.

Built to be developed and tested completely independently of the
OCR / NLP / Health Check pipeline. Integration happens later through
either a direct Python import or an HTTP API call — both are supported.

---

## Files

| File | Purpose |
|---|---|
| `scheme_rules.py` | Scheme knowledge base (hardcoded for now; swappable for myScheme dataset later) |
| `matcher.py` | Core matching logic — pure function, no DB/API dependency |
| `message_builder.py` | Turns matcher output into citizen-facing text (for dashboard, SMS, voice call) |
| `mock_data.py` | Fake citizen/document data for standalone testing |
| `test_scheme_engine.py` | Run directly to test the whole module with no other pieces needed |
| `api.py` | FastAPI wrapper exposing the module as an HTTP service |

---

## Run it standalone (no API, no other modules needed)

```bash
python test_scheme_engine.py
```

This runs 4 mock scenarios (expiring document, missing document, fully
healthy, already expired) and prints the results — confirms the module
works with zero external dependencies.

---

## Run it as an API service

```bash
pip install fastapi uvicorn pydantic
uvicorn api:app --reload --port 8001
```

Check it's alive:

```bash
curl http://localhost:8001/health
```

Call the main endpoint:

```bash
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
```

---

## INTEGRATION CONTRACT

This is what the OCR/NLP/Health-Check team and the Frontend team need
to know. Nothing else in this module should matter to them.

### Input shape

**`documents`** — list of dicts, one per citizen document:

```json
{
  "doc_type": "income_certificate",   // must match this module's taxonomy — see below
  "health": "ok" | "warning" | "expired",
  "days_left": 12                      // int, optional (null if unknown)
}
```

**`profile`** — dict with citizen demographic info:

```json
{
  "age": 65,
  "annual_income": 80000
}
```

### Recognized `doc_type` values (must match exactly)

- `income_certificate`
- `age_proof`
- `community_certificate`
- `land_record`

If OCR/NLP produces different labels, normalize them to these values
before calling the Scheme Engine (either in the pipeline code, or by
extending `scheme_rules.py`).

### Output shape

```json
{
  "citizen_id": "test123",
  "eligible_now": [
    { "scheme_id": "...", "scheme_name": "...", "message": "..." }
  ],
  "eligible_at_risk": [
    {
      "scheme_id": "...",
      "scheme_name": "...",
      "flagged_docs": ["income_certificate"],
      "status": "expiring" | "expired",
      "days_left": 12,
      "message": "..."
    }
  ],
  "potentially_eligible": [
    {
      "scheme_id": "...",
      "scheme_name": "...",
      "missing_docs": ["community_certificate"],
      "message": "..."
    }
  ]
}
```

`eligible_at_risk` items are exactly what should feed the voice
call / SMS alert trigger — their `message` field is ready to pass
directly to Indic Parler-TTS or an SMS gateway with no further
formatting needed.

---

## How to integrate later

### Option A — Direct Python import (if same codebase)

```python
from scheme_engine.matcher import get_displayable_schemes
from scheme_engine.message_builder import attach_messages

result = get_displayable_schemes(documents, profile)
result = attach_messages(result)
```

### Option B — HTTP call (if run as a separate service)

```python
import requests

response = requests.post(
    "http://localhost:8001/scheme-status",
    json={"citizen_id": citizen_id, "documents": documents, "profile": profile},
)
result = response.json()
```

Recommended: use an environment variable for the URL so it's a one-line
change if the service moves to a different machine/port during the
hackathon:

```python
import os
SCHEME_ENGINE_URL = os.getenv("SCHEME_ENGINE_URL", "http://localhost:8001")
```

---

## Where this fits in the overall pipeline

```
OCR → NLP field extraction → Health Check → [ SCHEME ENGINE ] → Alert Trigger
```

The Scheme Engine should be called AFTER Health Check produces the
`health` status for a document, using the citizen's FULL document set
(not just the newest upload), since eligibility for many schemes
depends on multiple documents at once.
