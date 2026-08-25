"""
SEVAALERT Notification Dispatcher
---------------------------------
Translates structured document JSON from SevaAlert into formatted alerts
and sends them to the offline notification system (WhatsApp / API).

Supports:
- Automatic severity mapping (CRITICAL for expired, HIGH for expiring soon, etc.)
- Rich human-readable alert message generation from extracted JSON fields
- HTTP API dispatch (FastAPI server at http://localhost:8000/api/alert)
- Direct SQLite DB queue insertion fallback (--direct-db)
- CLI invocation to send existing JSON files as alerts
"""

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


def determine_alert_severity(result: Dict[str, Any]) -> str:
    """
    Computes alert severity based on validity status, warnings, and field confidence:
    - CRITICAL: Document is expired.
    - HIGH: Document is expiring soon (within window) or low document type confidence.
    - MEDIUM: Any field flagged with needs_review or has warnings.
    - LOW: Valid document with high confidence and no warnings.
    """
    validity = result.get("validity") or {}
    status = (validity.get("status") or "").lower()

    if status == "expired":
        return "CRITICAL"
    if status == "expiring_soon":
        return "HIGH"

    doc_type = result.get("document_type") or {}
    if doc_type.get("confidence", 1.0) < 0.5:
        return "HIGH"

    warnings = result.get("warnings") or []
    if warnings:
        return "MEDIUM"

    fields = result.get("fields") or {}
    for f in fields.values():
        if isinstance(f, dict) and f.get("needs_review"):
            return "MEDIUM"

    return "LOW"


def determine_event_type(result: Dict[str, Any]) -> str:
    """Returns a normalized event type for the alert."""
    doc_type_val = (result.get("document_type") or {}).get("value", "document")
    validity = result.get("validity") or {}
    status = validity.get("status")

    if status in ("expired", "expiring_soon"):
        return f"{doc_type_val}_{status}"
    return f"{doc_type_val}_analysis"


def build_alert_message(
    result: Dict[str, Any],
    report_text: Optional[str] = None,
    document_source: Optional[str] = None,
) -> Tuple[str, str, str]:
    """
    Constructs (event_type, message, severity) from SevaAlert structured JSON.
    """
    doc_type = (result.get("document_type") or {}).get("value", "Unknown Document")
    doc_type_title = doc_type.replace("_", " ").title()
    severity = determine_alert_severity(result)
    event_type = determine_event_type(result)

    validity = result.get("validity") or {}
    status = (validity.get("status") or "unknown").lower()
    valid_from = validity.get("valid_from")
    expiry_date = validity.get("expiry_date")

    lines: List[str] = [
        f"📄 SEVAALERT: {doc_type_title.upper()}",
        "------------------------------------",
    ]

    # Validity header with status indicator
    if status == "expired":
        lines.append(f"⛔ STATUS: EXPIRED (Expired on: {expiry_date or 'N/A'})")
    elif status == "expiring_soon":
        lines.append(f"⚠️ STATUS: EXPIRING SOON (Valid until: {expiry_date or 'N/A'})")
    elif status == "valid":
        expiry_info = f" (Valid until: {expiry_date})" if expiry_date else ""
        lines.append(f"✅ STATUS: VALID{expiry_info}")
    else:
        lines.append("ℹ️ STATUS: VALIDITY UNKNOWN")

    if valid_from and valid_from != expiry_date:
        lines.append(f"📅 Issue Date: {valid_from}")

    lines.append("")
    lines.append("📌 Extracted Details:")

    fields = result.get("fields") or {}
    if not fields:
        lines.append("  (No specific fields extracted)")
    else:
        for key, field_data in fields.items():
            if not isinstance(field_data, dict):
                continue
            val = field_data.get("value")
            if val in (None, ""):
                continue

            field_label = key.replace("_", " ").title()
            currency = field_data.get("currency")
            if currency and isinstance(val, (int, float)):
                display_val = f"₹{val:,.2f}" if currency == "INR" else f"{val} {currency}"
            else:
                display_val = str(val)

            flag = " ⚠️ [Needs Review]" if field_data.get("needs_review") else ""
            lines.append(f"  • {field_label}: {display_val}{flag}")

    # Warnings section
    warnings = result.get("warnings") or []
    if warnings:
        lines.append("")
        lines.append("⚠️ Warnings / Review Items:")
        for w in warnings:
            lines.append(f"  - {w}")

    if document_source:
        lines.append("")
        lines.append(f"📁 Document: {Path(document_source).name}")

    message = "\n".join(lines)
    return event_type, message, severity


def send_document_alert(
    result: Dict[str, Any],
    report_text: Optional[str] = None,
    location: Optional[str] = None,
    recipients: Optional[List[str]] = None,
    severity: Optional[str] = None,
    api_url: str = "http://localhost:8000/api/alert",
    direct_db: bool = False,
    db_path: str = "notifications.db",
) -> Dict[str, Any]:
    """
    Sends the structured document details as an alert to the notification service.
    
    Parameters:
    - result: Structured JSON dictionary from SevaAlert pipeline
    - report_text: Optional human-readable report string
    - location: Optional location string or document file path
    - recipients: Optional list of recipient phone numbers
    - severity: Optional severity override ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')
    - api_url: HTTP endpoint for notification service
    - direct_db: If True, writes directly to SQLite DB without HTTP
    - db_path: SQLite DB path for direct DB mode
    """
    auto_event_type, formatted_message, auto_severity = build_alert_message(
        result=result,
        report_text=report_text,
        document_source=location,
    )

    final_severity = (severity or auto_severity).upper()
    event_type = auto_event_type

    payload = {
        "event_type": event_type,
        "message": formatted_message,
        "severity": final_severity,
        "location": location,
        "recipients": recipients,
        "json_details": result,
    }

    if direct_db:
        return _send_via_direct_db(payload, db_path)

    # Attempt HTTP API call
    try:
        req_data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        req = urllib.request.Request(
            api_url,
            data=req_data,
            headers={"Content-Type": "application/json; charset=utf-8"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            resp_body = response.read().decode("utf-8")
            resp_json = json.loads(resp_body)
            return {
                "success": True,
                "mode": "http_api",
                "alert_id": resp_json.get("alert_id"),
                "status": resp_json.get("status", "queued"),
                "event_type": event_type,
                "severity": final_severity,
            }
    except urllib.error.URLError as e:
        # Fallback to direct DB if local server is unreachable
        print(f"[Notification] HTTP API ({api_url}) unreachable: {e}. Falling back to direct database insertion...")
        db_res = _send_via_direct_db(payload, db_path)
        db_res["http_fallback"] = True
        db_res["http_error"] = str(e)
        return db_res
    except Exception as e:
        return {
            "success": False,
            "mode": "http_api",
            "error": str(e),
            "event_type": event_type,
            "severity": final_severity,
        }


def _send_via_direct_db(payload: Dict[str, Any], db_path: str) -> Dict[str, Any]:
    """Inserts alert directly into the SQLite notifications database."""
    try:
        from notification.main_whatsapp import init_db, db

        init_db(db_path)
        recipients_json = json.dumps(payload["recipients"]) if payload.get("recipients") else None
        details_json = json.dumps(payload["json_details"], ensure_ascii=False) if payload.get("json_details") else None

        with db(db_path) as conn:
            cur = conn.execute(
                """
                INSERT INTO alerts (event_type, message, severity, location, recipients_override, json_details, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    payload["event_type"],
                    payload["message"],
                    payload["severity"],
                    payload.get("location"),
                    recipients_json,
                    details_json,
                    datetime.now().isoformat(),
                ),
            )
            alert_id = cur.lastrowid

        return {
            "success": True,
            "mode": "direct_db",
            "alert_id": alert_id,
            "status": "queued",
            "db_path": db_path,
            "event_type": payload["event_type"],
            "severity": payload["severity"],
        }
    except Exception as e:
        return {
            "success": False,
            "mode": "direct_db",
            "error": str(e),
            "db_path": db_path,
        }


def main():
    parser = argparse.ArgumentParser(description="SEVAALERT Notification Dispatcher — send JSON details as an alert")
    parser.add_argument("json_file", help="Path to SevaAlert output JSON file")
    parser.add_argument("--url", default="http://localhost:8000/api/alert", help="Notification API endpoint URL")
    parser.add_argument("--recipient", action="append", dest="recipients", help="Recipient phone number (can repeat)")
    parser.add_argument("--severity", choices=["LOW", "MEDIUM", "HIGH", "CRITICAL"], help="Override severity")
    parser.add_argument("--direct-db", action="store_true", help="Enqueue directly into notifications.db")
    parser.add_argument("--db-path", default="notifications.db", help="Path to notifications.db")
    args = parser.parse_args()

    json_path = Path(args.json_file)
    if not json_path.exists():
        print(f"Error: File not found: {json_path}", file=sys.stderr)
        sys.exit(1)

    try:
        result_data = json.loads(json_path.read_text(encoding="utf-8"))
    except Exception as e:
        print(f"Error reading JSON from {json_path}: {e}", file=sys.stderr)
        sys.exit(1)

    print(f"Loaded JSON from {json_path}")
    alert_resp = send_document_alert(
        result=result_data,
        location=str(json_path),
        recipients=args.recipients,
        severity=args.severity,
        api_url=args.url,
        direct_db=args.direct_db,
        db_path=args.db_path,
    )

    print("=" * 60)
    print("NOTIFICATION DISPATCH RESULT")
    print("=" * 60)
    print(json.dumps(alert_resp, indent=2))


if __name__ == "__main__":
    main()
