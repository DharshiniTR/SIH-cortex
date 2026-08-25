"""
test_scheme_engine.py
----------------------
Run this file directly to test the Scheme Engine completely standalone:

    python test_scheme_engine.py

No database, no OCR, no API server needed. Uses mock_data.py to
simulate what the real pipeline will eventually feed in.
"""

from matcher import get_displayable_schemes
from message_builder import attach_messages
import mock_data


def run_case(label: str, documents: list[dict], profile: dict):
    print(f"\n{'=' * 60}")
    print(f"CASE: {label}")
    print(f"{'=' * 60}")
    print(f"Profile: {profile}")
    print(f"Documents: {documents}")

    result = get_displayable_schemes(documents, profile)
    result = attach_messages(result)

    print("\n-- Eligible Now --")
    for s in result["eligible_now"]:
        print(f"  [OK] {s['scheme_name']}: {s['message']}")

    print("\n-- Eligible but At Risk --")
    for s in result["eligible_at_risk"]:
        print(f"  [!!] {s['scheme_name']}: {s['message']}")

    print("\n-- Potentially Eligible (missing docs) --")
    for s in result["potentially_eligible"]:
        print(f"  [??] {s['scheme_name']}: {s['message']}")

    return result


if __name__ == "__main__":
    run_case(
        "Elderly citizen, income cert expiring soon",
        mock_data.MOCK_DOCUMENTS_CASE_EXPIRING,
        mock_data.MOCK_PROFILE_CASE_EXPIRING,
    )

    run_case(
        "Student, missing required document",
        mock_data.MOCK_DOCUMENTS_CASE_MISSING,
        mock_data.MOCK_PROFILE_CASE_MISSING,
    )

    run_case(
        "Farmer, all documents healthy",
        mock_data.MOCK_DOCUMENTS_CASE_HEALTHY,
        mock_data.MOCK_PROFILE_CASE_HEALTHY,
    )

    run_case(
        "Citizen with an already-expired document",
        mock_data.MOCK_DOCUMENTS_CASE_EXPIRED,
        mock_data.MOCK_PROFILE_CASE_EXPIRED,
    )

    print(f"\n{'=' * 60}")
    print("All test cases ran successfully — module works standalone.")
    print(f"{'=' * 60}")
