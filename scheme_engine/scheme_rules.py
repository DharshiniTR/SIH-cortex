"""
scheme_rules.py
----------------
Holds the scheme knowledge base used by the Scheme Engine.

For the hackathon, this is a small hardcoded dictionary of 3 schemes.
Later, this can be swapped out for data loaded from the myScheme dataset
(e.g. via Hugging Face `shrijayan/gov_myscheme`) or synced from data.gov.in,
WITHOUT changing matcher.py — as long as the shape below is preserved.

Shape contract for each scheme entry:
{
    "name": str,
    "required_docs": list[str],       # doc_type values, must match your OCR/NLP taxonomy
    "eligibility": {
        "min_age": int (optional),
        "max_age": int (optional),
        "max_income": int (optional),
    }
}
"""

SCHEMES = {
    "old_age_pension": {
        "name": "Old Age Pension Scheme",
        "required_docs": ["age_proof", "income_certificate"],
        "eligibility": {"min_age": 60, "max_income": 100000},
    },
    "student_scholarship": {
        "name": "Educational Scholarship",
        "required_docs": ["income_certificate", "community_certificate"],
        "eligibility": {"max_age": 25, "max_income": 250000},
    },
    "farmer_subsidy": {
        "name": "Farmer Input Subsidy",
        "required_docs": ["land_record", "income_certificate"],
        "eligibility": {},
    },
}


def get_all_schemes() -> dict:
    """Single access point — matcher.py should call this instead of importing
    SCHEMES directly, so swapping the data source later (DB / myScheme dataset)
    only requires changing this one function."""
    return SCHEMES
