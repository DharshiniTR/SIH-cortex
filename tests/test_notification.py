"""
Unit and integration tests for SevaAlert notification dispatcher.
"""
import json
import os
import sqlite3
import tempfile
import unittest
from pathlib import Path
from starlette.testclient import TestClient

from notification.main_whatsapp import app, init_db, db
from notification.notifier import (
    build_alert_message,
    determine_alert_severity,
    determine_event_type,
    send_document_alert,
)


class TestNotificationLogic(unittest.TestCase):
    def setUp(self):
        self.sample_valid_doc = {
            "document_type": {"value": "income_certificate", "confidence": 0.95},
            "fields": {
                "person_name": {"value": "Ramesh Kumar", "confidence": 0.96, "needs_review": False},
                "annual_income": {
                    "value": 120000,
                    "currency": "INR",
                    "confidence": 0.94,
                    "needs_review": False,
                },
                "certificate_number": {"value": "TN/INC/2026/9988", "confidence": 0.98},
            },
            "validity": {
                "valid_from": "2026-01-01",
                "expiry_date": "2027-01-01",
                "status": "valid",
            },
            "warnings": [],
        }

        self.sample_expired_doc = {
            "document_type": {"value": "income_certificate", "confidence": 0.92},
            "fields": {
                "person_name": {"value": "Kalaiselvi S", "confidence": 0.95},
                "annual_income": {"value": 96000, "currency": "INR", "confidence": 0.95},
            },
            "validity": {
                "valid_from": "2024-05-15",
                "expiry_date": "2025-05-14",
                "status": "expired",
            },
            "warnings": [],
        }

        self.sample_expiring_soon_doc = {
            "document_type": {"value": "community_certificate", "confidence": 0.90},
            "fields": {
                "person_name": {"value": "Anand V", "confidence": 0.92},
            },
            "validity": {
                "valid_from": "2025-09-01",
                "expiry_date": "2026-09-01",
                "status": "expiring_soon",
            },
            "warnings": [],
        }

        self.sample_warning_doc = {
            "document_type": {"value": "income_certificate", "confidence": 0.90},
            "fields": {
                "person_name": {"value": "Suresh P", "confidence": 0.50, "needs_review": True},
            },
            "validity": {
                "valid_from": "2026-01-01",
                "expiry_date": "2027-01-01",
                "status": "valid",
            },
            "warnings": ["'person_name' has low confidence (0.50) — needs manual review."],
        }

    def test_determine_alert_severity(self):
        self.assertEqual(determine_alert_severity(self.sample_expired_doc), "CRITICAL")
        self.assertEqual(determine_alert_severity(self.sample_expiring_soon_doc), "HIGH")
        self.assertEqual(determine_alert_severity(self.sample_warning_doc), "MEDIUM")
        self.assertEqual(determine_alert_severity(self.sample_valid_doc), "LOW")

    def test_determine_event_type(self):
        self.assertEqual(determine_event_type(self.sample_expired_doc), "income_certificate_expired")
        self.assertEqual(determine_event_type(self.sample_expiring_soon_doc), "community_certificate_expiring_soon")
        self.assertEqual(determine_event_type(self.sample_valid_doc), "income_certificate_analysis")

    def test_build_alert_message(self):
        event_type, msg, severity = build_alert_message(
            self.sample_expired_doc,
            document_source="sample_data/income.pdf",
        )
        self.assertEqual(severity, "CRITICAL")
        self.assertIn("INCOME CERTIFICATE", msg)
        self.assertIn("EXPIRED", msg)
        self.assertIn("Kalaiselvi S", msg)
        self.assertIn("₹96,000.00", msg)
        self.assertIn("income.pdf", msg)

    def test_direct_db_dispatch(self):
        with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp_db:
            db_path = tmp_db.name

        try:
            resp = send_document_alert(
                result=self.sample_expired_doc,
                location="sample_data/income.pdf",
                recipients=["+919876543210"],
                direct_db=True,
                db_path=db_path,
            )

            self.assertTrue(resp["success"])
            self.assertEqual(resp["mode"], "direct_db")
            self.assertEqual(resp["severity"], "CRITICAL")
            self.assertEqual(resp["alert_id"], 1)

            # Query the database to verify the record
            with db(db_path) as conn:
                row = conn.execute("SELECT * FROM alerts WHERE id=1").fetchone()
                self.assertIsNotNone(row)
                self.assertEqual(row["severity"], "CRITICAL")
                self.assertIn("EXPIRED", row["message"])
                self.assertIn("+919876543210", row["recipients_override"])
                saved_json = json.loads(row["json_details"])
                self.assertEqual(saved_json["document_type"]["value"], "income_certificate")
        finally:
            if os.path.exists(db_path):
                os.remove(db_path)

    def test_fastapi_endpoint_with_json_details(self):
        with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp_db:
            db_path = tmp_db.name

        os.environ["NOTIFICATION_DB_PATH"] = db_path
        os.environ["NOTIFICATION_MOCK"] = "1"

        try:
            init_db(db_path)
            client = TestClient(app)

            event_type, msg, severity = build_alert_message(self.sample_valid_doc)
            payload = {
                "event_type": event_type,
                "message": msg,
                "severity": severity,
                "location": "sample_data/test.pdf",
                "recipients": ["+919999999999"],
                "json_details": self.sample_valid_doc,
            }

            post_resp = client.post("/api/alert", json=payload)
            self.assertEqual(post_resp.status_code, 200)
            data = post_resp.json()
            self.assertIn("alert_id", data)

            get_resp = client.get(f"/api/alerts/{data['alert_id']}")
            self.assertEqual(get_resp.status_code, 200)
            alert_data = get_resp.json()["alert"]
            self.assertEqual(alert_data["event_type"], "income_certificate_analysis")
            self.assertEqual(alert_data["severity"], "LOW")
            self.assertEqual(alert_data["json_details"]["document_type"]["value"], "income_certificate")
            self.assertEqual(alert_data["recipients_override"], ["+919999999999"])
        finally:
            if os.path.exists(db_path):
                os.remove(db_path)


if __name__ == "__main__":
    unittest.main()
