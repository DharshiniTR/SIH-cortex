"""
SEVAALERT — offline government document intelligence. CLI tool, no UI.

Pipeline:
    file (PDF/JPG/PNG)
      -> pages (processing/pdf.py)
      -> PaddleOCR per page (ocr/paddle_ocr.py)
      -> Qwen2.5-VL classification + field extraction (document/analyzer.py)
      -> normalization (processing/normalization.py)
      -> validation / warnings (processing/validation.py)
      -> expiry status (processing/expiry.py)
      -> Qwen2.5-VL human-readable report (document/analyzer.py)
      -> print JSON + report, optionally save both to outputs/

Usage:
    python run.py sample_data/document.pdf
    python run.py sample_data/document.jpg --save
"""
import argparse
import json
import os
import sys
import time
from pathlib import Path

# Reduces CUDA memory fragmentation on tight-VRAM GPUs (see the hint in
# torch.OutOfMemoryError messages). Must be set before torch initializes CUDA.
os.environ.setdefault("PYTORCH_CUDA_ALLOC_CONF", "expandable_segments:True")

# MUST be imported before ocr.paddle_ocr (which lazily imports paddleocr/paddle).
# On Windows, if paddle loads into the process before torch, it corrupts the
# DLL search order for torch's shm.dll -> OSError: [WinError 127] The
# specified procedure could not be found. Importing torch first avoids it.
# (see PaddlePaddle/PaddleOCR#14979, #14982)
import torch  # noqa: F401

from processing.pdf import load_pages
from ocr.paddle_ocr import PaddleOCREngine
from document.analyzer import analyze_document, generate_report
from processing.normalization import normalize_result
from processing.validation import validate_result
from processing.expiry import compute_validity_status
from schemas.document import DocumentResult


from notification.notifier import send_document_alert


def run_pipeline(file_path: str) -> tuple[dict, str]:
    t0 = time.time()

    pages = load_pages(file_path)
    print(f"[1/5] Loaded {len(pages)} page(s) from {file_path}")

    ocr_engine = PaddleOCREngine()
    print(f"[2/5] Running OCR (lang={ocr_engine.lang}, gpu={ocr_engine.use_gpu}) ...")
    ocr_by_page = {}
    total_lines = 0
    for page_num, image in pages:
        items = ocr_engine.run(image, page=page_num)
        ocr_by_page[page_num] = items
        total_lines += len(items)
    print(f"       -> {total_lines} OCR line(s) detected across {len(pages)} page(s)")

    print("[3/5] Sending to Qwen2.5-VL for classification + extraction ...")
    result = analyze_document(pages, ocr_by_page)

    print("[4/5] Normalizing, validating, computing expiry status ...")
    result = normalize_result(result)
    result = validate_result(result)
    result = compute_validity_status(result)

    try:
        DocumentResult.model_validate(result)
    except Exception as e:
        result.setdefault("warnings", []).append(f"Result did not fully match expected schema: {e}")

    print("[5/5] Generating human-readable report ...")
    report_text = generate_report(result)

    elapsed = time.time() - t0
    print(f"\nDone in {elapsed:.1f}s\n")

    return result, report_text


def main():
    parser = argparse.ArgumentParser(description="SEVAALERT — offline government document analyzer & alert dispatcher")
    parser.add_argument("file", nargs="?", default=None, help="Path to a PDF, JPG, JPEG or PNG document (or omit if using --send-json)")
    parser.add_argument("--save", action="store_true", help="Save JSON + report to outputs/")
    parser.add_argument("--notify", action="store_true", help="Send structured JSON details as an alert to notification system")
    parser.add_argument("--notify-url", default="http://localhost:8000/api/alert", help="Notification API endpoint (default: http://localhost:8000/api/alert)")
    parser.add_argument("--recipient", action="append", dest="recipients", help="Recipient phone number (can specify multiple)")
    parser.add_argument("--severity", choices=["LOW", "MEDIUM", "HIGH", "CRITICAL"], help="Override alert severity")
    parser.add_argument("--direct-db", action="store_true", help="Enqueue alert directly in SQLite database (no HTTP server required)")
    parser.add_argument("--send-json", help="Send an existing output JSON file directly as an alert without re-analyzing")
    args = parser.parse_args()

    # Direct JSON sending mode
    if args.send_json:
        json_file_path = Path(args.send_json)
        if not json_file_path.exists():
            print(f"Error: JSON file not found: {json_file_path}", file=sys.stderr)
            sys.exit(1)
        try:
            result = json.loads(json_file_path.read_text(encoding="utf-8"))
        except Exception as e:
            print(f"Error reading JSON from {json_file_path}: {e}", file=sys.stderr)
            sys.exit(1)

        print(f"Sending JSON details from {json_file_path} to notification system...")
        alert_resp = send_document_alert(
            result=result,
            location=str(json_file_path),
            recipients=args.recipients,
            severity=args.severity,
            api_url=args.notify_url,
            direct_db=args.direct_db,
        )
        print("=" * 60)
        print("NOTIFICATION DISPATCH RESULT")
        print("=" * 60)
        print(json.dumps(alert_resp, indent=2))
        return

    if not args.file:
        parser.print_help()
        sys.exit(1)

    if not Path(args.file).exists():
        print(f"File not found: {args.file}", file=sys.stderr)
        sys.exit(1)

    result, report_text = run_pipeline(args.file)

    print("=" * 60)
    print("STRUCTURED JSON")
    print("=" * 60)
    print(json.dumps(result, indent=2, ensure_ascii=False))

    print("\n" + "=" * 60)
    print("REPORT")
    print("=" * 60)
    print(report_text)

    if args.save:
        out_dir = Path("outputs")
        out_dir.mkdir(exist_ok=True)
        stem = Path(args.file).stem
        json_path = out_dir / f"{stem}.json"
        report_path = out_dir / f"{stem}.report.txt"
        json_path.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")
        report_path.write_text(report_text, encoding="utf-8")
        print(f"\nSaved: {json_path}")
        print(f"Saved: {report_path}")

    if args.notify:
        print("\n" + "=" * 60)
        print("DISPATCHING ALERT NOTIFICATION")
        print("=" * 60)
        alert_resp = send_document_alert(
            result=result,
            report_text=report_text,
            location=args.file,
            recipients=args.recipients,
            severity=args.severity,
            api_url=args.notify_url,
            direct_db=args.direct_db,
        )
        print(json.dumps(alert_resp, indent=2))


if __name__ == "__main__":
    main()