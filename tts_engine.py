import os
import hashlib
import wave
import struct
import math
import logging
from pathlib import Path

logger = logging.getLogger("sevaalert.tts")

# Resolve paths relative to this file, not the process's cwd, so it works
# no matter where uvicorn is launched from.
BASE_DIR = Path(__file__).resolve().parent
AUDIO_DIR = BASE_DIR / "static" / "audio"
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

# Three possible backends:
#   "parler" - real Indic Parler-TTS model (best quality, needs torch + GPU
#              ideally + gated HF model access; heavy to install on Windows)
#   "gtts"   - Google Text-to-Speech via the gTTS package (real spoken audio,
#              lightweight install, needs internet at generation time, one
#              fixed voice per language, no custom voice-style control)
#   "mock"   - placeholder tone, no real speech, zero extra deps
#
# SEVAALERT_TTS_BACKEND can force one explicitly ("parler" / "gtts" / "mock").
# Otherwise we auto-detect: try parler first, then gTTS, then mock.
FORCED_BACKEND = os.environ.get("SEVAALERT_TTS_BACKEND", "").strip().lower()

_model = None
_tokenizer = None
_description_tokenizer = None
DEVICE = "cpu"


def _detect_backend() -> str:
    if FORCED_BACKEND in ("parler", "gtts", "mock"):
        return FORCED_BACKEND

    try:
        import torch  # noqa: F401
        from parler_tts import ParlerTTSForConditionalGeneration  # noqa: F401
        from transformers import AutoTokenizer  # noqa: F401
        import soundfile  # noqa: F401

        return "parler"
    except ImportError:
        pass

    try:
        from gtts import gTTS  # noqa: F401

        return "gtts"
    except ImportError:
        pass

    return "mock"


BACKEND = _detect_backend()

if BACKEND == "parler":
    import torch
    from parler_tts import ParlerTTSForConditionalGeneration
    from transformers import AutoTokenizer
    import soundfile as sf

    DEVICE = "cuda:0" if torch.cuda.is_available() else "cpu"
    logger.info("TTS backend: Parler-TTS (real speech, needs model download on first use).")
elif BACKEND == "gtts":
    from gtts import gTTS

    # gTTS uses standard ISO language codes — these line up with the
    # "ta"/"te"/"kn"/"hi"/"en" codes already used across this project.
    GTTS_LANG_MAP = {"ta": "ta", "te": "te", "kn": "kn", "hi": "hi", "en": "en"}
    logger.info("TTS backend: gTTS (real speech, needs internet, one fixed voice per language).")
else:
    logger.warning(
        "TTS backend: MOCK (placeholder tone, not real speech). "
        "Install gTTS for real speech with a light install (`pip install gTTS`), "
        "or torch/parler-tts/transformers/soundfile + Hugging Face access to "
        "ai4bharat/indic-parler-tts for the higher-quality model."
    )


def load_model():
    """Loads the model once at server startup. Call this in FastAPI's startup event."""
    global _model, _tokenizer, _description_tokenizer, BACKEND

    if BACKEND == "mock":
        logger.info("TTS running in MOCK mode — generating placeholder tones, not real speech.")
        return None

    if BACKEND == "gtts":
        logger.info("TTS running with gTTS — real speech, generated on demand per request.")
        return None

    if _model is None:
        logger.info("Loading Indic Parler-TTS on %s...", DEVICE)
        try:
            _model = ParlerTTSForConditionalGeneration.from_pretrained(
                "ai4bharat/indic-parler-tts"
            ).to(DEVICE)
            _tokenizer = AutoTokenizer.from_pretrained("ai4bharat/indic-parler-tts")
            _description_tokenizer = AutoTokenizer.from_pretrained(
                _model.config.text_encoder._name_or_path
            )
            logger.info("Model loaded.")
        except Exception:
            logger.exception("Failed to load TTS model — falling back to mock TTS for this run.")
            BACKEND = "mock"
    return _model


def _cache_key(text: str, description: str) -> str:
    raw = f"{text}|{description}".encode("utf-8")
    return hashlib.sha256(raw).hexdigest()[:20]


def _write_mock_wav(out_path: Path, text: str) -> None:
    """
    Writes a short placeholder tone (no external deps) so the rest of the
    pipeline — caching, static file serving, Twilio <Play> — can be
    exercised end-to-end without any real TTS backend installed.
    Duration scales a little with text length so different messages are
    at least distinguishable in length during a demo.
    """
    sample_rate = 16000
    duration_s = max(1.0, min(6.0, len(text) / 40))
    n_samples = int(sample_rate * duration_s)
    freq = 440.0

    with wave.open(str(out_path), "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)  # 16-bit
        wf.setframerate(sample_rate)
        for i in range(n_samples):
            t = i / sample_rate
            # gentle fade in/out to avoid clicks
            envelope = min(1.0, t * 8, (duration_s - t) * 8)
            sample = int(12000 * envelope * math.sin(2 * math.pi * freq * t))
            wf.writeframesraw(struct.pack("<h", sample))


def _generate_gtts(text: str, language: str, out_path_no_ext: Path) -> str:
    lang_code = GTTS_LANG_MAP.get(language, "en")
    out_path = out_path_no_ext.with_suffix(".mp3")
    tts = gTTS(text=text, lang=lang_code)
    tts.save(str(out_path))
    return str(out_path)


def generate_audio(text: str, description: str, language: str = "en") -> str:
    """
    Generates speech for `text`. `description` is used as the Parler-TTS
    voice-style prompt when that backend is active; it's ignored by gTTS
    and mock mode. `language` selects the gTTS voice.
    Returns the local file path. Skips regeneration if a cached file exists
    for this exact (backend, language, text) combination.
    """
    if not text or not text.strip():
        raise ValueError("text to synthesize must not be empty")

    key = _cache_key(f"{BACKEND}|{language}|{text}", description)
    out_path_no_ext = AUDIO_DIR / key

    # Check for either extension already cached
    for ext in (".wav", ".mp3"):
        candidate = out_path_no_ext.with_suffix(ext)
        if candidate.exists():
            return str(candidate)

    if BACKEND == "mock":
        out_path = out_path_no_ext.with_suffix(".wav")
        _write_mock_wav(out_path, text)
        return str(out_path)

    if BACKEND == "gtts":
        try:
            return _generate_gtts(text, language, out_path_no_ext)
        except Exception:
            logger.exception("gTTS generation failed — writing a mock placeholder instead.")
            # gTTS can leave a truncated/empty file behind on a failed request
            partial = out_path_no_ext.with_suffix(".mp3")
            if partial.exists():
                partial.unlink()
            out_path = out_path_no_ext.with_suffix(".wav")
            _write_mock_wav(out_path, text)
            return str(out_path)

    # BACKEND == "parler"
    if _model is None:
        load_model()

    if BACKEND == "mock":  # load_model may have flipped this on a load failure
        out_path = out_path_no_ext.with_suffix(".wav")
        _write_mock_wav(out_path, text)
        return str(out_path)

    out_path = out_path_no_ext.with_suffix(".wav")
    try:
        input_ids = _description_tokenizer(description, return_tensors="pt").input_ids.to(DEVICE)
        prompt_ids = _tokenizer(text, return_tensors="pt").input_ids.to(DEVICE)

        generation = _model.generate(input_ids=input_ids, prompt_input_ids=prompt_ids)
        audio = generation.cpu().numpy().squeeze()
        sf.write(str(out_path), audio, _model.config.sampling_rate)
    except Exception:
        logger.exception("TTS generation failed — writing a mock placeholder instead.")
        _write_mock_wav(out_path, text)

    return str(out_path)
