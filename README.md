# SEVAALERT — Offline Government Document Intelligence (CLI)

Upload any Indian government document (PDF/JPG/PNG) → automatically identify it →
extract all meaningful details → get structured JSON + a human-readable report.

No UI. Command-line tool only. Fully offline after the one-time model downloads.

```
document (PDF/JPG/PNG)
       |
       v
  processing/pdf.py        -> per-page images
       |
       v
  ocr/paddle_ocr.py         -> OCR text + bbox + confidence (PaddleOCR)
       |
       v
  document/analyzer.py      -> Qwen2.5-VL-3B-Instruct: classification + field extraction
       |
       v
  processing/normalization.py -> date/currency formatting only (never re-extracts)
  processing/validation.py    -> low-confidence / missing-field warnings
  processing/expiry.py        -> valid / expired / expiring_soon / unknown
       |
       v
  document/analyzer.py      -> Qwen2.5-VL-3B-Instruct: human-readable report
       |
       v
  structured JSON + report printed to console (and optionally saved)
```

No certificate-specific regex or per-document parsers anywhere in the pipeline —
Qwen does all semantic understanding of labels, values, and document type.

## 1. Install

Python 3.10 or 3.11 required (PaddleOCR doesn't ship 3.12+ wheels yet).

```bash
python3.11 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
python -m pip install --upgrade pip

# Install torch WITH CUDA first (check your version via `nvidia-smi`)
pip install torch==2.4.1 torchvision==0.19.1 --index-url https://download.pytorch.org/whl/cu121

pip install -r requirements.txt

# System dependency for PDF handling
sudo apt-get install -y poppler-utils   # macOS: brew install poppler
```

If you don't have a GPU, the code auto-falls-back to CPU (slower, but functional) —
no changes needed.

## 2. Run

```bash
python run.py sample_data/your_document.pdf
python run.py sample_data/your_document.jpg --save   # also writes to outputs/
```

First run downloads:
- PaddleOCR detection/recognition weights (~few hundred MB, cached under `~/.paddleocr/`)
- Qwen2.5-VL-3B-Instruct weights (~6-7GB bf16, cached under `~/.cache/huggingface/`)

Every run after that is fully offline. The Qwen model is loaded once per process
(`models/qwen_model.py` uses `lru_cache`) — running the tool on many documents in
one process (e.g. a batch script importing `run_pipeline`) only pays the load cost once.

## 3. Output

Console prints progress (`[1/5] ... [5/5] ...`), then the structured JSON, then the
report. With `--save`, both are also written to `outputs/<filename>.json` and
`outputs/<filename>.report.txt`.

Example JSON shape:

```json
{
  "document_type": {"value": "income_certificate", "confidence": 0.96},
  "fields": {
    "person_name": {"value": "Kalaiselvi S", "confidence": 0.96, "source_text": "Name: Kalaiselvi S", "page": 1, "needs_review": false},
    "annual_income": {"value": 96000, "confidence": 0.94, "original_value": "96000", "normalized_value": 96000, "currency": "INR", "needs_review": false}
  },
  "validity": {"valid_from": "2024-05-15", "expiry_date": "2025-05-14", "status": "expired"},
  "warnings": []
}
```

## 4. Project structure

```
sevaalert/
├── run.py                    # CLI entry point — the whole pipeline
├── requirements.txt
├── models/
│   └── qwen_model.py          # Qwen2.5-VL loader (cached, GPU/CPU auto-detect)
├── ocr/
│   └── paddle_ocr.py           # PaddleOCR wrapper (text+bbox+confidence+page)
├── document/
│   ├── prompts.py               # Extraction + report prompt templates
│   └── analyzer.py               # Qwen calls: extraction and report generation
├── processing/
│   ├── pdf.py                     # PDF/image -> per-page PIL images
│   ├── normalization.py           # Post-extraction date/currency cleanup only
│   ├── validation.py              # Low-confidence / missing-field warnings
│   └── expiry.py                  # Validity status computation
├── schemas/
│   └── document.py                # Permissive pydantic schema (sanity check only)
├── notification/                  # Notification & WhatsApp alert integration
│   ├── main_whatsapp.py          # FastAPI service + WhatsApp worker queue
│   ├── notifier.py               # JSON alert formatting & dispatcher client
│   └── requirements.txt
├── outputs/                       # --save writes here
└── tests/
    ├── test_qwen_load.py          # Standalone Qwen load/generate sanity check
    ├── test_ocr.py                # Standalone OCR sanity check
    └── test_notification.py       # Notification formatting & dispatch tests
```

## 5. Notification & Alert System

SevaAlert can send structured document JSON details directly to the offline notification system as an alert.

### Automatically dispatch alert when analyzing document:
```bash
# Send via Notification API (FastAPI server at http://localhost:8000/api/alert)
python run.py sample_data/sample_income_certificate.png --notify

# Send with explicit recipient phone number:
python run.py sample_data/sample_income_certificate.png --notify --recipient +919876543210

# Direct SQLite queue mode (works offline without needing the HTTP server running):
python run.py sample_data/sample_income_certificate.png --notify --direct-db
```

### Send an existing JSON file directly as an alert:
```bash
python run.py --send-json outputs/sample_income_certificate.json --recipient +919876543210
# Or using the notifier module directly:
python -m notification.notifier outputs/sample_income_certificate.json --direct-db
```

### Starting the Notification Service (WhatsApp / FastAPI):
```bash
uvicorn notification.main_whatsapp:app --host 0.0.0.0 --port 8000
```

### Alert Severity Mapping:
- **`CRITICAL`**: Document is `expired`.
- **`HIGH`**: Document is `expiring_soon` (within 30 days) or low document classification confidence.
- **`MEDIUM`**: Any fields flagged with `needs_review` or containing validation warnings.
- **`LOW`**: Valid document with verified confidence and no warnings.

## 6. Config

`SEVAALERT_MODEL_PATH` env var overrides the Qwen model source (defaults to
`Qwen/Qwen2.5-VL-3B-Instruct`) — point it at a local/quantized checkpoint later
without touching code.

## 6. Smoke-testing without the ML stack (SEVAALERT_MOCK)

Installing PaddleOCR + Qwen2.5-VL-3B (multi-GB downloads, ideally a GPU) isn't
always convenient just to check that the plumbing works. Set:

```bash
SEVAALERT_MOCK=1 python run.py sample_data/sample_income_certificate.png --save
```

and the OCR and Qwen calls are swapped for deterministic fake logic (real
`pdf.py` page loading still runs) — everything downstream (normalization,
validation, expiry, schema check, report formatting, `--save`) executes for
real. This is only for testing the wiring; unset `SEVAALERT_MOCK` (or set it
to anything other than `1`) for actual document extraction.

## 7. Known limitations (by design, for this MVP)

- Only the first page's image is sent to Qwen's vision encoder; OCR text from
  all pages is still included as context. Fine for single-page certificates —
  extend `document/analyzer.py` to send multiple images if you need true
  multi-page visual understanding.
- No fine-tuning — this is the zero-shot Phase 1 pipeline the original spec
  calls for. Evaluate accuracy on real documents before considering fine-tuning.
- No database, auth, or scheduling — this is a single-document CLI tool.


# Python 3.10 or 3.11 required (PaddleOCR doesn't ship 3.12+ wheels yet)
py -3.11 -m venv venv
.\venv\Scripts\Activate.ps1

python -m pip install --upgrade pip

# Install torch WITH CUDA first (check your version via `nvidia-smi`)
pip install torch==2.4.1 torchvision==0.19.1 --index-url https://download.pytorch.org/whl/cu121

pip install -r requirements.txt