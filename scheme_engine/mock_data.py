"""
mock_data.py
------------
Fake data standing in for what the OCR + NLP + Health Check pipeline
will eventually produce. Lets you build and test the Scheme Engine
completely standalone, before that pipeline is ready.

When integrating later, replace these with real calls, e.g.:
    documents = get_all_processed_documents(citizen_id)
    profile   = get_citizen_profile(citizen_id)

The SHAPE of the data below must stay the same for the swap to be safe.
"""

# Citizen 1: elderly citizen, income cert about to expire, eligible for pension
MOCK_DOCUMENTS_CASE_EXPIRING = [
    {"doc_type": "income_certificate", "health": "warning", "days_left": 12},
    {"doc_type": "age_proof", "health": "ok", "days_left": 200},
]
MOCK_PROFILE_CASE_EXPIRING = {"age": 65, "annual_income": 80000}

# Citizen 2: student, missing a required document for scholarship
MOCK_DOCUMENTS_CASE_MISSING = [
    {"doc_type": "income_certificate", "health": "ok", "days_left": 300},
]
MOCK_PROFILE_CASE_MISSING = {"age": 20, "annual_income": 150000}

# Citizen 3: farmer, everything present and healthy
MOCK_DOCUMENTS_CASE_HEALTHY = [
    {"doc_type": "land_record", "health": "ok", "days_left": 400},
    {"doc_type": "income_certificate", "health": "ok", "days_left": 250},
]
MOCK_PROFILE_CASE_HEALTHY = {"age": 45, "annual_income": 60000}

# Citizen 4: document already expired
MOCK_DOCUMENTS_CASE_EXPIRED = [
    {"doc_type": "income_certificate", "health": "expired", "days_left": -5},
    {"doc_type": "age_proof", "health": "ok", "days_left": 100},
]
MOCK_PROFILE_CASE_EXPIRED = {"age": 62, "annual_income": 90000}

# Default set used by test_scheme_engine.py
MOCK_DOCUMENTS = MOCK_DOCUMENTS_CASE_EXPIRING
MOCK_PROFILE = MOCK_PROFILE_CASE_EXPIRING
