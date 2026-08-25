"""
Core document-understanding logic. Two functions:

- analyze_document(): OCR text + document image -> Qwen -> structured JSON
                       (classification + field extraction in one call)
- generate_report():  structured JSON -> Qwen -> human-readable report text

No certificate-specific regex, no per-document-type parsers. Qwen does all
semantic understanding; this module just wires OCR/image in and JSON out.
"""
import json
import os
import re
from typing import Any, Dict, List, Tuple

from PIL import Image

from document.prompts import build_extraction_prompt, build_report_prompt

# Set SEVAALERT_MOCK=1 to skip loading Qwen2.5-VL entirely (no multi-GB
# download, no GPU needed). Lets the rest of the pipeline (normalization,
# validation, expiry, schema, CLI) be smoke-tested on any machine.
_MOCK = os.environ.get("SEVAALERT_MOCK") == "1"

# Qwen doesn't need 300dpi-scan resolution to classify a document and read
# labels — it's mainly using the image to disambiguate garbled OCR text.
# A huge image blows up the number of vision tokens (and thus GPU memory)
# for little accuracy gain, which matters a lot on consumer GPUs with
# limited VRAM. Cap the longest side; override with SEVAALERT_MAX_IMAGE_SIDE
# if you have VRAM to spare and want more detail sent to the model.
_MAX_IMAGE_SIDE = int(os.environ.get("SEVAALERT_MAX_IMAGE_SIDE", "1280"))


def _resize_for_qwen(image: Image.Image) -> Image.Image:
    w, h = image.size
    longest = max(w, h)
    if longest <= _MAX_IMAGE_SIDE:
        return image
    scale = _MAX_IMAGE_SIDE / longest
    return image.resize((int(w * scale), int(h * scale)), Image.LANCZOS)


def _format_ocr_for_prompt(ocr_by_page: Dict[int, List[Dict[str, Any]]]) -> str:
    lines = []
    for page_num in sorted(ocr_by_page.keys()):
        lines.append(f"[Page {page_num}]")
        items = ocr_by_page[page_num]
        if not items:
            lines.append("(no text detected on this page)")
            continue
        for item in items:
            prefix = "[low-confidence] " if item["confidence"] < 0.6 else ""
            lines.append(f"{prefix}{item['text']}")
    return "\n".join(lines)


def _extract_json_block(text: str) -> Dict[str, Any]:
    """
    Pull the JSON object out of the model's raw text output. This is parsing
    of the model's own response format, not document field extraction, so
    it's fine to use a bit of string handling here (the spec's regex ban is
    about extracting document FIELDS, not about parsing the model's reply).
    """
    cleaned = re.sub(r"^```(json)?", "", text.strip(), flags=re.IGNORECASE).strip()
    cleaned = re.sub(r"```$", "", cleaned.strip()).strip()

    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start == -1 or end == -1 or end < start:
        raise ValueError(f"No JSON object found in model output:\n{cleaned[:500]}")

    return json.loads(cleaned[start:end + 1])


def _run_qwen_chat(messages: List[Dict[str, Any]], max_new_tokens: int) -> str:
    from models.qwen_model import get_model_and_processor  # lazy import (heavy: torch/transformers)

    model, processor = get_model_and_processor()

    text_prompt = processor.apply_chat_template(
        messages, tokenize=False, add_generation_prompt=True
    )

    has_image = any(
        isinstance(c, dict) and c.get("type") == "image"
        for msg in messages for c in msg.get("content", [])
    )

    if has_image:
        from qwen_vl_utils import process_vision_info
        image_inputs, video_inputs = process_vision_info(messages)
        inputs = processor(
            text=[text_prompt],
            images=image_inputs,
            videos=video_inputs,
            padding=True,
            return_tensors="pt",
        ).to(model.device)
    else:
        inputs = processor(text=[text_prompt], return_tensors="pt").to(model.device)

    generated_ids = model.generate(**inputs, max_new_tokens=max_new_tokens, do_sample=False)
    generated_ids_trimmed = generated_ids[:, inputs.input_ids.shape[1]:]
    return processor.batch_decode(generated_ids_trimmed, skip_special_tokens=True)[0].strip()


def analyze_document(
    pages: List[Tuple[int, Image.Image]],
    ocr_by_page: Dict[int, List[Dict[str, Any]]],
) -> Dict[str, Any]:
    """
    Sends OCR text (all pages) + the first page's image to Qwen2.5-VL and
    returns the parsed structured result: document_type, fields, validity.

    NOTE: only the first page's image is sent to the vision encoder (most
    government certificates are single-page). OCR text from ALL pages is
    still included as context. Multi-image support can be added later if
    needed for genuinely multi-page certificates.
    """
    if _MOCK:
        return _mock_analyze(ocr_by_page)

    ocr_text_block = _format_ocr_for_prompt(ocr_by_page)
    primary_image = _resize_for_qwen(pages[0][1])
    prompt_text = build_extraction_prompt(ocr_text_block)

    messages = [
        {
            "role": "user",
            "content": [
                {"type": "image", "image": primary_image},
                {"type": "text", "text": prompt_text},
            ],
        }
    ]

    output_text = _run_qwen_chat(messages, max_new_tokens=2000)

    try:
        result = _extract_json_block(output_text)
    except (ValueError, json.JSONDecodeError) as e:
        # Fail soft — never crash on an unparseable/unknown document.
        result = {
            "document_type": {"value": "unknown", "confidence": 0.0},
            "fields": {},
            "validity": {"valid_from": None, "expiry_date": None},
            "warnings": [f"Model output could not be parsed as JSON: {e}"],
        }

    result.setdefault("fields", {})
    result.setdefault("validity", {"valid_from": None, "expiry_date": None})
    result.setdefault("warnings", [])
    return result


def generate_report(structured_result: Dict[str, Any]) -> str:
    """Text-only Qwen call: structured JSON -> human-readable report."""
    if _MOCK:
        return _mock_report(structured_result)

    structured_json_str = json.dumps(structured_result, indent=2, ensure_ascii=False)
    prompt_text = build_report_prompt(structured_json_str)

    messages = [{"role": "user", "content": [{"type": "text", "text": prompt_text}]}]
    return _run_qwen_chat(messages, max_new_tokens=600)


def _mock_analyze(ocr_by_page: Dict[int, List[Dict[str, Any]]]) -> Dict[str, Any]:
    """Deterministic fake extraction used only when SEVAALERT_MOCK=1, built
    from whatever OCR text is actually present so the rest of the pipeline
    (normalization/validation/expiry/report) still has real data to work on.
    """
    all_text = " ".join(
        item["text"] for items in ocr_by_page.values() for item in items
    ).lower()

    doc_type = "income_certificate" if "income" in all_text else "unknown"

    fields: Dict[str, Any] = {}

    def _grab(label: str, field_name: str, page: int = 1):
        for items in ocr_by_page.values():
            for item in items:
                if label.lower() in item["text"].lower():
                    value = item["text"].split(":", 1)[-1].strip()
                    fields[field_name] = {
                        "value": value,
                        "confidence": item["confidence"],
                        "source_text": item["text"],
                        "page": page,
                    }
                    return

    _grab("Certificate No", "certificate_number")
    _grab("District", "district")
    _grab("Name:", "person_name")
    _grab("Father Name", "father_name")
    _grab("Annual Income", "annual_income")
    _grab("Issue Date", "issue_date")
    _grab("Valid Until", "expiry_hint")

    validity = {
        "valid_from": fields.pop("issue_date", {}).get("value") if "issue_date" in fields else None,
        "expiry_date": fields.pop("expiry_hint", {}).get("value") if "expiry_hint" in fields else None,
    }

    return {
        "document_type": {"value": doc_type, "confidence": 0.9 if doc_type != "unknown" else 0.2},
        "fields": fields,
        "validity": validity,
        "warnings": ["[mock mode] Qwen2.5-VL was not called — this is deterministic fake extraction."],
    }


def _mock_report(structured_result: Dict[str, Any]) -> str:
    doc_type = structured_result.get("document_type", {}).get("value", "unknown")
    lines = ["DOCUMENT ANALYSIS REPORT", "", "Document Type:", doc_type, ""]
    for name, field in structured_result.get("fields", {}).items():
        if not isinstance(field, dict) or field.get("value") in (None, ""):
            continue
        lines.append(f"{name.replace('_', ' ').title()}:")
        lines.append(str(field["value"]))
        lines.append("")
    validity = structured_result.get("validity") or {}
    if validity.get("valid_from") or validity.get("expiry_date"):
        lines.append("Validity:")
        lines.append(f"{validity.get('valid_from')} - {validity.get('expiry_date')}")
        lines.append("")
        lines.append("Status:")
        lines.append(validity.get("status", "unknown"))
        lines.append("")
    warnings = structured_result.get("warnings") or []
    lines.append("Warnings:")
    lines.extend(warnings if warnings else ["None"])
    return "\n".join(lines)