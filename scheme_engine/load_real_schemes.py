"""
load_real_schemes.py
----------------------
Loads real government scheme data from the myScheme dataset (Hugging Face)
and converts it into the same SCHEMES dict shape that scheme_rules.py
currently hardcodes — so matcher.py doesn't need to change at all.

*** IMPORTANT ***
The field names below (SCHEME_NAME_FIELD, DOCS_FIELD, etc.) are best
guesses based on the dataset's public description, NOT confirmed against
the actual dataset schema. Before relying on this in your demo:

    1. Run this locally (needs internet access to huggingface.co):
         from datasets import load_dataset
         ds = load_dataset("shrijayan/gov_myscheme")
         print(ds["train"][0])   # inspect one real row

    2. Update the field name constants below to match what you see.

    3. Then run this file to generate a populated scheme_rules.py.

This two-step process is deliberate — guessing field names and shipping
them unverified risks a silent bug in your demo (e.g. every scheme
showing "missing" because a field name didn't match).
"""

import re
import json

# ---- TODO: confirm these against the real dataset row before using ----
SCHEME_ID_FIELD = "scheme_id"
SCHEME_NAME_FIELD = "scheme_name"
DOCS_FIELD = "documents_required"
ELIGIBILITY_FIELD = "eligibility_criteria"
# -------------------------------------------------------------------


# Maps free-text document mentions to YOUR fixed doc_type taxonomy.
# Extend this as you discover more document phrasing in the real data.
DOC_TYPE_KEYWORDS = {
    "income certificate": "income_certificate",
    "income proof": "income_certificate",
    "aadhaar": "aadhaar",
    "aadhar": "aadhaar",
    "community certificate": "community_certificate",
    "caste certificate": "community_certificate",
    "land record": "land_record",
    "land ownership": "land_record",
    "age proof": "age_proof",
    "date of birth certificate": "age_proof",
    "domicile certificate": "domicile_certificate",
}


def normalize_doc_types(raw_text: str) -> list[str]:
    """Extracts known doc_type values from a free-text requirements string."""
    if not raw_text:
        return []
    text_lower = raw_text.lower()
    found = set()
    for phrase, doc_type in DOC_TYPE_KEYWORDS.items():
        if phrase in text_lower:
            found.add(doc_type)
    return sorted(found)


def parse_eligibility(raw_text: str) -> dict:
    """
    Extracts min_age / max_age / max_income from free-text eligibility
    criteria using simple regex. This is intentionally conservative —
    if it can't confidently parse a number, it leaves that field out
    rather than guessing wrong.
    """
    if not raw_text:
        return {}

    elig = {}
    text_lower = raw_text.lower()

    age_match = re.search(r'(\d{1,3})\s*(?:years|yrs)', text_lower)
    if age_match:
        age_value = int(age_match.group(1))
        if "above" in text_lower or "minimum" in text_lower or "at least" in text_lower:
            elig["min_age"] = age_value
        elif "below" in text_lower or "maximum" in text_lower or "up to" in text_lower:
            elig["max_age"] = age_value

    income_match = re.search(r'(?:income|earn)[^\d]{0,20}(\d[\d,]{3,})', text_lower)
    if income_match:
        elig["max_income"] = int(income_match.group(1).replace(",", ""))

    return elig


def slugify(text: str) -> str:
    return re.sub(r'[^a-z0-9]+', '_', text.lower()).strip('_')


def load_and_convert_schemes(limit: int = None) -> dict:
    """
    Loads the myScheme dataset and converts it to the SCHEMES dict shape.
    Requires internet access to huggingface.co — run this locally, not
    in a restricted/offline environment.
    """
    from datasets import load_dataset

    dataset = load_dataset("shrijayan/gov_myscheme")
    rows = dataset["train"]
    if limit:
        rows = rows.select(range(min(limit, len(rows))))

    schemes = {}
    skipped = 0

    for row in rows:
        name = row.get(SCHEME_NAME_FIELD)
        if not name:
            skipped += 1
            continue

        scheme_id = row.get(SCHEME_ID_FIELD) or slugify(name)
        required_docs = normalize_doc_types(row.get(DOCS_FIELD, ""))
        eligibility = parse_eligibility(row.get(ELIGIBILITY_FIELD, ""))

        # skip schemes we couldn't map to any known document type —
        # they'd never match anything in your pipeline anyway
        if not required_docs:
            skipped += 1
            continue

        schemes[scheme_id] = {
            "name": name,
            "required_docs": required_docs,
            "eligibility": eligibility,
        }

    print(f"Loaded {len(schemes)} schemes, skipped {skipped} (no mappable documents).")
    return schemes


def write_scheme_rules_file(schemes: dict, output_path: str = "scheme_rules_real.py"):
    """
    Writes the converted schemes out as a Python file with the exact
    same SCHEMES dict shape as scheme_rules.py — so you can review it,
    then rename it to replace scheme_rules.py once you're happy with it.
    """
    with open(output_path, "w") as f:
        f.write('"""\nAuto-generated from the myScheme dataset. Review before using in production.\n"""\n\n')
        f.write("SCHEMES = ")
        f.write(json.dumps(schemes, indent=4))
        f.write("\n\n\ndef get_all_schemes() -> dict:\n    return SCHEMES\n")
    print(f"Written to {output_path} — review it, then rename to scheme_rules.py to use it.")


if __name__ == "__main__":
    # Start small — inspect a limited batch before converting everything
    schemes = load_and_convert_schemes(limit=50)
    write_scheme_rules_file(schemes)
