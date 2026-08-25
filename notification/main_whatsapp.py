"""
Smart Offline Notification System — WhatsApp Edition (for now)
------------------------------------------------------------------
Run: uvicorn main_whatsapp:app --host 0.0.0.0 --port 8000

Uses pywhatkit to send WhatsApp messages via WhatsApp Web automation.

REQUIREMENTS BEFORE THIS WORKS:
1. Chrome browser installed on this machine.
2. This machine must already be logged into WhatsApp Web
   (open web.whatsapp.com once, scan QR code from your phone).
3. This machine needs an active internet connection.
4. A visible display (won't work on a headless server without a
   virtual display like Xvfb).

Per-alert, you only need to provide: phone number + message.
"""

import json
import os
import sqlite3
import threading
import time
from datetime import datetime
from enum import Enum
from queue import PriorityQueue
from contextlib import contextmanager

try:
    import pywhatkit as kit
except ImportError:
    kit = None

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

# ---------------- Config ----------------
def get_db_path() -> str:
    return os.environ.get("NOTIFICATION_DB_PATH", "notifications.db")

MAX_RETRIES = 3
RETRY_DELAY_SEC = 20
SEND_WAIT_SEC = 20   # time pywhatkit waits for WhatsApp Web tab to load before typing
CLOSE_TAB_AFTER = True

SEVERITY_ORDER = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3}


class Severity(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class AlertRequest(BaseModel):
    event_type: str
    message: str
    severity: Severity = Severity.MEDIUM
    location: str | None = None
    recipients: list[str] | None = None  # if omitted, use default authorized numbers
    json_details: dict | None = None  # structured document details from SevaAlert


# ---------------- DB setup ----------------
@contextmanager
def db(db_path: str | None = None):
    path = db_path or get_db_path()
    conn = sqlite3.connect(path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db(db_path: str | None = None):
    path = db_path or get_db_path()
    with db(path) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_type TEXT,
                message TEXT,
                severity TEXT,
                location TEXT,
                recipients_override TEXT,
                json_details TEXT,
                status TEXT DEFAULT 'queued',
                retry_count INTEGER DEFAULT 0,
                created_at TEXT,
                sent_at TEXT
            )
        """)
        # Backward-compatible column migration
        cursor = conn.execute("PRAGMA table_info(alerts)")
        existing_cols = [row[1] for row in cursor.fetchall()]
        if "recipients_override" not in existing_cols:
            conn.execute("ALTER TABLE alerts ADD COLUMN recipients_override TEXT")
        if "json_details" not in existing_cols:
            conn.execute("ALTER TABLE alerts ADD COLUMN json_details TEXT")

        conn.execute("""
            CREATE TABLE IF NOT EXISTS recipients (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                phone_number TEXT UNIQUE,
                authorized INTEGER DEFAULT 1,
                min_severity TEXT DEFAULT 'LOW'
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS delivery_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                alert_id INTEGER,
                phone_number TEXT,
                status TEXT,
                attempted_at TEXT,
                error TEXT
            )
        """)


# ---------------- WhatsApp sender ----------------
def send_whatsapp(number: str, message: str) -> tuple[bool, str]:
    """
    Sends a WhatsApp message instantly via WhatsApp Web automation.
    Requires this machine to already be logged into WhatsApp Web in Chrome.
    """
    if os.environ.get("NOTIFICATION_MOCK") == "1" or kit is None:
        return True, "MOCK_SENT"

    try:
        kit.sendwhatmsg_instantly(
            phone_no=number,
            message=message,
            wait_time=SEND_WAIT_SEC,
            tab_close=CLOSE_TAB_AFTER,
        )
        return True, "SENT"
    except Exception as e:
        return False, str(e)


# ---------------- Alert queue worker ----------------
alert_queue: PriorityQueue = PriorityQueue()


def enqueue_alert(alert_id: int, severity: str):
    priority = SEVERITY_ORDER.get(severity, 5)
    alert_queue.put((priority, alert_id))


def get_recipients_for(override: list[str] | None):
    if override:
        return override
    with db() as conn:
        rows = conn.execute(
            "SELECT phone_number FROM recipients WHERE authorized = 1"
        ).fetchall()
    return [r["phone_number"] for r in rows]


def worker_loop():
    while True:
        priority, alert_id = alert_queue.get()
        with db() as conn:
            row = conn.execute(
                "SELECT * FROM alerts WHERE id = ?", (alert_id,)
            ).fetchone()
        if row is None:
            continue

        recipients_override = None
        if "recipients_override" in row.keys() and row["recipients_override"]:
            try:
                recipients_override = json.loads(row["recipients_override"])
            except Exception:
                recipients_override = None

        recipients = get_recipients_for(recipients_override)
        full_message = format_message(row)

        all_sent = True
        for number in recipients:
            success, resp = send_whatsapp(number, full_message)
            log_delivery(alert_id, number, success, resp)
            if not success:
                all_sent = False
            time.sleep(1 if os.environ.get("NOTIFICATION_MOCK") == "1" else 3)

        with db() as conn:
            if all_sent:
                conn.execute(
                    "UPDATE alerts SET status='sent', sent_at=? WHERE id=?",
                    (datetime.now().isoformat(), alert_id),
                )
            else:
                retry_count = row["retry_count"] + 1
                if retry_count <= MAX_RETRIES:
                    conn.execute(
                        "UPDATE alerts SET retry_count=?, status='retrying' WHERE id=?",
                        (retry_count, alert_id),
                    )
                    threading.Timer(
                        RETRY_DELAY_SEC, lambda: enqueue_alert(alert_id, row["severity"])
                    ).start()
                else:
                    conn.execute(
                        "UPDATE alerts SET status='failed' WHERE id=?", (alert_id,)
                    )
        alert_queue.task_done()


def format_message(row) -> str:
    lines = [
        "🚨 ALERT",
        "",
        row["message"],
        "",
        f"Time: {row['created_at']}",
    ]
    if row["location"]:
        lines.append(f"Location: {row['location']}")
    lines.append(f"Severity: {row['severity']}")
    return "\n".join(lines)


def log_delivery(alert_id, number, success, resp):
    with db() as conn:
        conn.execute(
            "INSERT INTO delivery_log (alert_id, phone_number, status, attempted_at, error) "
            "VALUES (?, ?, ?, ?, ?)",
            (
                alert_id,
                number,
                "sent" if success else "failed",
                datetime.now().isoformat(),
                None if success else resp,
            ),
        )


# ---------------- FastAPI app ----------------
app = FastAPI(title="Smart Offline Notification System (WhatsApp)")


@app.on_event("startup")
def startup():
    init_db()
    t = threading.Thread(target=worker_loop, daemon=True)
    t.start()


@app.post("/api/alert")
def create_alert(alert: AlertRequest):
    recipients_json = json.dumps(alert.recipients) if alert.recipients else None
    details_json = json.dumps(alert.json_details, ensure_ascii=False) if alert.json_details else None

    with db() as conn:
        cur = conn.execute(
            "INSERT INTO alerts (event_type, message, severity, location, recipients_override, json_details, created_at) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (
                alert.event_type,
                alert.message,
                alert.severity.value,
                alert.location,
                recipients_json,
                details_json,
                datetime.now().isoformat(),
            ),
        )
        alert_id = cur.lastrowid

    enqueue_alert(alert_id, alert.severity.value)
    return {"alert_id": alert_id, "status": "queued"}


@app.get("/api/alerts")
def list_alerts(limit: int = 50):
    with db() as conn:
        rows = conn.execute(
            "SELECT * FROM alerts ORDER BY id DESC LIMIT ?", (limit,)
        ).fetchall()
    results = []
    for r in rows:
        d = dict(r)
        if d.get("json_details"):
            try:
                d["json_details"] = json.loads(d["json_details"])
            except Exception:
                pass
        if d.get("recipients_override"):
            try:
                d["recipients_override"] = json.loads(d["recipients_override"])
            except Exception:
                pass
        results.append(d)
    return results


@app.get("/api/alerts/{alert_id}")
def get_alert(alert_id: int):
    with db() as conn:
        row = conn.execute("SELECT * FROM alerts WHERE id=?", (alert_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Alert not found")
        deliveries = conn.execute(
            "SELECT * FROM delivery_log WHERE alert_id=?", (alert_id,)
        ).fetchall()
    alert_dict = dict(row)
    if alert_dict.get("json_details"):
        try:
            alert_dict["json_details"] = json.loads(alert_dict["json_details"])
        except Exception:
            pass
    if alert_dict.get("recipients_override"):
        try:
            alert_dict["recipients_override"] = json.loads(alert_dict["recipients_override"])
        except Exception:
            pass
    return {"alert": alert_dict, "deliveries": [dict(d) for d in deliveries]}


class RecipientRequest(BaseModel):
    phone_number: str
    min_severity: Severity = Severity.LOW


@app.post("/api/recipients")
def add_recipient(r: RecipientRequest):
    with db() as conn:
        try:
            conn.execute(
                "INSERT INTO recipients (phone_number, min_severity) VALUES (?, ?)",
                (r.phone_number, r.min_severity.value),
            )
        except sqlite3.IntegrityError:
            raise HTTPException(400, "Recipient already exists")
    return {"status": "added", "phone_number": r.phone_number}


@app.get("/api/recipients")
def list_recipients():
    with db() as conn:
        rows = conn.execute("SELECT * FROM recipients").fetchall()
    return [dict(r) for r in rows]


@app.delete("/api/recipients/{phone_number}")
def remove_recipient(phone_number: str):
    with db() as conn:
        conn.execute(
            "UPDATE recipients SET authorized=0 WHERE phone_number=?", (phone_number,)
        )
    return {"status": "removed"}
