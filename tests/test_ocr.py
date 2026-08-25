"""
Step 3 sanity check: does OCR actually read a real document correctly?

Run with:
    python tests/test_ocr.py sample_data/your_document.pdf
    python tests/test_ocr.py sample_data/your_document.jpg

No Qwen involved yet — this only proves the OCR layer works and gives you
a chance to eyeball the text/confidence before it becomes Qwen's input.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from processing.pdf import load_pages
from ocr.paddle_ocr import PaddleOCREngine


def main():
    if len(sys.argv) < 2:
        print("Usage: python tests/test_ocr.py <path_to_pdf_or_image>")
        sys.exit(1)

    file_path = sys.argv[1]
    pages = load_pages(file_path)
    print(f"Loaded {len(pages)} page(s) from {file_path}")

    engine = PaddleOCREngine()
    print(f"OCR engine: lang={engine.lang}, use_gpu={engine.use_gpu}\n")

    all_items = []
    for page_num, image in pages:
        print(f"--- Page {page_num} ({image.size[0]}x{image.size[1]}) ---")
        items = engine.run(image, page=page_num)
        all_items.extend(items)

        if not items:
            print("  (no text detected)")
            continue

        for item in items:
            print(f"  [{item['confidence']:.2f}] {item['text']}")

    confidences = [i["confidence"] for i in all_items]
    if confidences:
        avg_conf = sum(confidences) / len(confidences)
        print(f"\nTotal lines: {len(all_items)}  |  Average confidence: {avg_conf:.2f}")
    else:
        print("\nNo text detected in this document at all.")


if __name__ == "__main__":
    main()
