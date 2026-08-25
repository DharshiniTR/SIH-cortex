"""
Thin wrapper around PaddleOCR — the ONLY place in the codebase that talks
to the OCR engine directly. Kept isolated so a different offline engine
could be swapped in later without touching anything downstream.

Contract: run(image) returns a list of dicts, one per detected text line:
    {
        "text": str,
        "confidence": float,             # 0..1, OCR engine's own confidence
        "bbox": [[x,y]*4],               # 4 corner points, top-left first
        "line_index": int,               # reading-order index within the page
    }

100% local/offline at inference time. PaddleOCR only needs internet the
very first time to download its open-source detection/recognition model
weights, cached under ~/.paddleocr/ afterwards.
"""
import os
from functools import lru_cache
from typing import List, Dict, Any, Union
from pathlib import Path

from PIL import Image
import numpy as np

DEFAULT_LANG = "en"  # PaddleOCR lang code — "en", "hi", "ta", "te", "kn", etc.

# Set SEVAALERT_MOCK=1 to skip the real PaddleOCR model entirely (no download,
# no GPU/CPU inference). Useful for CI / smoke-testing the rest of the
# pipeline (pdf loading -> field wiring -> normalization -> validation ->
# expiry -> report) on a machine without the ML stack installed.
_MOCK = os.environ.get("SEVAALERT_MOCK") == "1"
# NOTE: a single PaddleOCR model instance only supports ONE language family
# per instance. Multilingual routing (auto-detect + switch lang) is handled
# in a later step, not here — this wrapper just exposes lang as a parameter.

# paddlepaddle-gpu and a CUDA-enabled torch cannot coexist in the same
# process (both register a conflicting global pybind11 GPU-properties type
# -> ImportError: generic_type: type "_gpuDeviceProperties" is already
# registered!). Qwen needs the GPU more than OCR does, so OCR defaults to
# CPU. Set SEVAALERT_OCR_GPU=1 only if no CUDA torch model is loaded in the
# same process.
_FORCE_OCR_GPU = os.environ.get("SEVAALERT_OCR_GPU") == "1"


@lru_cache(maxsize=4)
def _get_paddle_ocr(lang: str, use_gpu: bool):
    """Cached per (lang, use_gpu) — loading model weights is expensive."""
    from paddleocr import PaddleOCR  # lazy import

    return PaddleOCR(use_angle_cls=True, lang=lang, use_gpu=use_gpu, show_log=False)


class PaddleOCREngine:
    def __init__(self, lang: str = DEFAULT_LANG, use_gpu: bool = None):
        if use_gpu is None:
            use_gpu = _FORCE_OCR_GPU
        self.lang = lang
        self.use_gpu = use_gpu

    def run(self, image: Union[str, Path, Image.Image], page: int = 1) -> List[Dict[str, Any]]:
        """
        image: file path OR a PIL.Image (e.g. one page from processing/pdf.py)
        page: page number to stamp onto every returned item
        """
        if _MOCK:
            return self._mock_run(page)

        ocr = _get_paddle_ocr(self.lang, self.use_gpu)

        if isinstance(image, Image.Image):
            image_input = np.array(image)
        else:
            image_input = str(image)

        raw_result = ocr.ocr(image_input, cls=True)

        items: List[Dict[str, Any]] = []
        if not raw_result or raw_result[0] is None:
            return items

        for detection in raw_result[0]:
            bbox, (text, confidence) = detection
            text = (text or "").strip()
            if not text:
                continue
            items.append({
                "text": text,
                "confidence": float(confidence),
                "bbox": bbox,
                "page": page,
            })

        return _assign_reading_order(items)

    def _mock_run(self, page: int) -> List[Dict[str, Any]]:
        """Deterministic fake OCR output used only when SEVAALERT_MOCK=1."""
        fake_lines = [
            "GOVERNMENT OF TAMIL NADU",
            "INCOME CERTIFICATE",
            "Certificate No: TN/INC/2024/001234",
            "District: Chennai",
            "Name: Kalaiselvi S",
            "Father Name: Senthil Kumar",
            "Annual Income: Rs. 96,000",
            "Issue Date: 15/05/2024",
            "Valid Until: 14/05/2025",
        ]
        items = [
            {
                "text": text,
                "confidence": 0.95,
                "bbox": [[0, i * 30], [200, i * 30], [200, i * 30 + 20], [0, i * 30 + 20]],
                "page": page,
                "line_index": i,
            }
            for i, text in enumerate(fake_lines)
        ]
        return items


def _assign_reading_order(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Sort top-to-bottom, then left-to-right within visual rows (tolerant
    of small OCR y-jitter), to approximate true reading order."""

    def y_center(item):
        ys = [p[1] for p in item["bbox"]]
        return sum(ys) / len(ys)

    def x_center(item):
        xs = [p[0] for p in item["bbox"]]
        return sum(xs) / len(xs)

    items = sorted(items, key=y_center)
    rows: List[List[Dict[str, Any]]] = []
    row_tolerance_px = 15
    for item in items:
        placed = False
        for row in rows:
            if abs(y_center(row[0]) - y_center(item)) <= row_tolerance_px:
                row.append(item)
                placed = True
                break
        if not placed:
            rows.append([item])

    ordered: List[Dict[str, Any]] = []
    for row in rows:
        row.sort(key=x_center)
        ordered.extend(row)

    for idx, item in enumerate(ordered):
        item["line_index"] = idx

    return ordered