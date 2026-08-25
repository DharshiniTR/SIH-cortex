"""
Turns any accepted input (PDF, JPG, JPEG, PNG) into a list of
(page_number, PIL.Image) tuples, so everything downstream (OCR, Qwen)
can treat single images and multi-page PDFs identically.
"""
from pathlib import Path
from typing import List, Tuple

from PIL import Image

SUPPORTED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png"}


def load_pages(file_path: str) -> List[Tuple[int, Image.Image]]:
    """
    Returns [(page_number, PIL.Image), ...] — page_number starts at 1.
    A JPG/PNG is treated as a single page.
    """
    path = Path(file_path)
    ext = path.suffix.lower()

    if ext not in SUPPORTED_EXTENSIONS:
        raise ValueError(
            f"Unsupported file type: {ext}. Supported: {sorted(SUPPORTED_EXTENSIONS)}"
        )

    if ext == ".pdf":
        return _load_pdf_pages(str(path))
    else:
        image = Image.open(path).convert("RGB")
        return [(1, image)]


def _load_pdf_pages(pdf_path: str) -> List[Tuple[int, Image.Image]]:
    from pdf2image import convert_from_path  # lazy import — needs poppler installed

    images = convert_from_path(pdf_path, dpi=300)  # 300dpi: good OCR accuracy vs speed tradeoff
    if not images:
        raise ValueError(f"No pages could be extracted from PDF: {pdf_path}")

    return [(idx + 1, img.convert("RGB")) for idx, img in enumerate(images)]
