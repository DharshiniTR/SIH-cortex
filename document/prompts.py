"""
Prompt templates for the two Qwen calls in the pipeline:
1. EXTRACTION — document image + OCR text -> structured JSON
2. REPORT     — structured JSON -> short human-readable report

No certificate-specific regex or hardcoded field logic lives here — this
is purely the instruction text that tells Qwen HOW to reason about the
document. All classification and extraction happens inside the model.
"""

SUPPORTED_DOC_TYPES = [
    "pan_card", "aadhaar", "income_certificate", "community_certificate",
    "caste_certificate", "residence_certificate", "nativity_certificate",
    "birth_certificate", "death_certificate", "disability_certificate",
    "driving_licence", "ration_card", "educational_certificate",
    "other_government_certificate", "unknown",
]

COMMON_FIELDS_HINT = [
    "person_name", "father_name", "mother_name", "document_number",
    "certificate_number", "registration_number", "date_of_birth", "gender",
    "address", "village", "taluk", "district", "state", "country", "pincode",
    "annual_income", "community", "caste", "issue_date", "expiry_date",
    "valid_from", "valid_until", "issuing_authority", "department",
    "designation", "purpose", "application_number", "scheme_name",
]

EXTRACTION_INSTRUCTIONS = """You are an expert reader of Indian government documents and \
certificates (English or any Indian regional language: Tamil, Hindi, Telugu, Kannada, \
Malayalam, Marathi, Bengali, Gujarati, Punjabi, Odia, Assamese, Urdu).

You are given:
1. The original document image.
2. OCR text extracted from the document (grouped by page, in reading order). OCR can contain \
errors — merged words, misread characters, wrong spacing (e.g. "Se nthil kum ar", "D0B") — use \
the image to verify/correct when the OCR text looks garbled. Lines marked [low-confidence] had \
uncertain OCR.

Your job:
1. Decide what type of document this is.
2. Extract every meaningful field present — not just a fixed checklist. Understand label-to-value \
relationships semantically (e.g. "Certificate No: XYZ" means certificate_number = XYZ), even \
across noisy or differently-laid-out documents.
3. If the original text is in an Indian language, keep the extracted "value" in its original \
script/language, but still use an English snake_case field name.
4. Give a confidence score (0.0-1.0) for the document type and for every field, reflecting your \
own certainty based on OCR quality and how explicit the label was.
5. Identify issue date / validity period / expiry date if present. Do not invent dates that are \
not present.
6. Never invent a value that is not actually present in the document or OCR text — if something \
is unreadable or absent, omit that field rather than guessing.
"""


def build_extraction_prompt(ocr_text_block: str) -> str:
    doc_types = ", ".join(SUPPORTED_DOC_TYPES)
    common_fields = ", ".join(COMMON_FIELDS_HINT)

    return f"""{EXTRACTION_INSTRUCTIONS}

Likely document types (pick the closest match, or "unknown" with low confidence if none fit \
well): {doc_types}

Common field names to use when applicable (use these standardized names so downstream systems \
can rely on them, but ALSO add any other meaningful field under a sensible descriptive name if \
the document contains information not covered by this list): {common_fields}

OCR TEXT:
---
{ocr_text_block}
---

Return ONLY a single valid JSON object, nothing else (no markdown fences, no explanation, no \
commentary before or after), in exactly this shape:

{{
  "document_type": {{"value": "<one of the listed types>", "confidence": 0.0}},
  "fields": {{
    "<field_name>": {{"value": "<value>", "confidence": 0.0, "source_text": "<OCR line it came from, if applicable>", "page": <page number or null>}}
  }},
  "validity": {{"valid_from": "YYYY-MM-DD or null", "expiry_date": "YYYY-MM-DD or null"}}
}}

Rules:
- Dates: normalize to YYYY-MM-DD when you can determine the actual calendar date with confidence; \
otherwise use null rather than guessing.
- annual_income (if present): output as a plain number (no currency symbols, no commas).
- Only include a field if you actually found evidence for it in the document.
- If you cannot confidently determine the document type, use "unknown" with a confidence below \
0.5 rather than forcing a guess.
"""


REPORT_INSTRUCTIONS = """You are given the final structured extraction result (JSON) for an \
Indian government document — already validated, normalized, with expiry status computed. Write \
a short, clear, human-readable report a citizen could read at a glance.

Rules:
- Use ONLY the information present in the JSON. Do not invent anything.
- Follow this exact structure and section order (omit the Validity/Status section entirely if \
there is no validity information at all):

DOCUMENT ANALYSIS REPORT

Document Type:
<value>

<Field Label>:
<value>
(repeat one block per notable field — skip fields with no value)

Validity:
<valid_from> - <expiry_date>

Status:
<Valid / Expired / Expiring Soon / Unknown>

Warnings:
<one per line, or "None">

- Keep it concise — this is a summary, not a restatement of every field.
- Format currency with the ₹ symbol and thousands separators if an amount is present.
- Do not use markdown formatting (no **, no #, no bullet characters).
"""


def build_report_prompt(structured_json_str: str) -> str:
    return REPORT_INSTRUCTIONS + "\n\nSTRUCTURED RESULT JSON:\n" + structured_json_str
