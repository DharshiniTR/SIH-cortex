# Per-language message templates.
# {name}, {cert}, {days}, {center}, {schemes} are filled in at runtime.

VOICE_TEMPLATES = {
    "ta": (
        "வணக்கம் {name}. உங்கள் {cert} இன்னும் {days} நாட்களில் "
        "காலாவதியாகிறது. தயவுசெய்து அருகிலுள்ள {center} மையத்தில் "
        "புதுப்பிக்கவும். {schemes}"
    ),
    "te": (
        "నమస్కారం {name}. మీ {cert} మరో {days} రోజుల్లో గడువు ముగుస్తుంది. "
        "దయచేసి సమీపంలోని {center} కేంద్రంలో పునరుద్ధరించండి. {schemes}"
    ),
    "kn": (
        "ನಮಸ್ಕಾರ {name}. ನಿಮ್ಮ {cert} {days} ದಿನಗಳಲ್ಲಿ ಅವಧಿ ಮುಗಿಯಲಿದೆ. "
        "ದಯವಿಟ್ಟು ಹತ್ತಿರದ {center} ಕೇಂದ್ರದಲ್ಲಿ ನವೀಕರಿಸಿ. {schemes}"
    ),
    "hi": (
        "नमस्ते {name}. आपका {cert} {days} दिनों में समाप्त हो रहा है। "
        "कृपया निकटतम {center} केंद्र पर नवीनीकरण करवाएं। {schemes}"
    ),
    "en": (
        "Hello {name}. Your {cert} is expiring in {days} days. "
        "Please renew it at your nearest {center} centre. {schemes}"
    ),
}

# Voice description per language — kept fixed and reused, not regenerated per call
VOICE_DESCRIPTIONS = {
    "ta": "A clear, warm female voice speaking Tamil in a calm, informative tone, with minimal background noise.",
    "te": "A clear, warm female voice speaking Telugu in a calm, informative tone, with minimal background noise.",
    "kn": "A clear, warm female voice speaking Kannada in a calm, informative tone, with minimal background noise.",
    "hi": "A clear, warm female voice speaking Hindi in a calm, informative tone, with minimal background noise.",
    "en": "A clear, warm female voice speaking English in a calm, informative tone, with minimal background noise.",
}

SMS_TEMPLATES = {
    "ta": "வணக்கம் {name}, {scheme} திட்டத்திற்கு நீங்கள் தகுதியானவர். மேலும் தகவலுக்கு அருகிலுள்ள ஈ-சேவை மையத்தை அணுகவும்.",
    "te": "నమస్కారం {name}, మీరు {scheme} పథకానికి అర్హులు. మరింత సమాచారం కోసం సమీప ఈ-సేవా కేంద్రాన్ని సందర్శించండి.",
    "kn": "ನಮಸ್ಕಾರ {name}, ನೀವು {scheme} ಯೋಜನೆಗೆ ಅರ್ಹರಾಗಿದ್ದೀರಿ. ಹೆಚ್ಚಿನ ಮಾಹಿತಿಗಾಗಿ ಹತ್ತಿರದ ಇ-ಸೇವಾ ಕೇಂದ್ರವನ್ನು ಸಂಪರ್ಕಿಸಿ.",
    "hi": "नमस्ते {name}, आप {scheme} योजना के लिए पात्र हैं। अधिक जानकारी के लिए निकटतम ई-सेवा केंद्र पर जाएं।",
    "en": "Hello {name}, you are eligible for the {scheme} scheme. Visit your nearest e-Sevai centre for details.",
}


def build_scheme_clause(language: str, schemes: list) -> str:
    """Builds the trailing sentence about extra certs needed for eligible schemes."""
    if not schemes:
        return ""
    clauses = {
        "ta": "மேலும், {scheme} திட்டத்திற்கு {certs} தேவை.",
        "te": "అలాగే, {scheme} పథకానికి {certs} అవసరం.",
        "kn": "ಅಲ್ಲದೆ, {scheme} ಯೋಜನೆಗೆ {certs} ಅಗತ್ಯವಿದೆ.",
        "hi": "साथ ही, {scheme} योजना के लिए {certs} की आवश्यकता है।",
        "en": "Also, the {scheme} scheme requires {certs}.",
    }
    template = clauses.get(language, clauses["en"])
    parts = []
    for s in schemes:
        certs_str = ", ".join(s.additional_certs_required)
        parts.append(template.format(scheme=s.scheme_name, certs=certs_str))
    return " ".join(parts)
