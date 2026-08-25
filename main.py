import os
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles

from models import ReminderRequest, ReminderResponse
from templates import VOICE_TEMPLATES, VOICE_DESCRIPTIONS, build_scheme_clause
from centers import find_nearest_center
from tts_engine import load_model, generate_audio, BACKEND

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("sevaalert")

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
(STATIC_DIR / "audio").mkdir(parents=True, exist_ok=True)

# ---- Config (use env vars in real deployment, never hardcode) ----
TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN")
TWILIO_FROM_NUMBER = os.environ.get("TWILIO_FROM_NUMBER")
PUBLIC_BASE_URL = os.environ.get("PUBLIC_BASE_URL", "http://localhost:8000")

twilio_client = None
if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
    try:
        from twilio.rest import Client

        twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    except ImportError:
        logger.warning("twilio package not installed — running without call placement.")
else:
    logger.info("Twilio credentials not set — running in DEV MODE (no real calls placed).")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load the TTS model once when the server starts, not per-request
    load_model()
    logger.info("SevaAlert TTS backend: %s", BACKEND)
    if BACKEND == "mock":
        logger.warning(
            "Running with MOCK TTS — audio files are placeholder tones, not real speech. "
            "Install gTTS (`pip install gTTS`) for real speech with a light install, "
            "or torch/parler-tts + HF access to ai4bharat/indic-parler-tts for the full model."
        )
    yield


app = FastAPI(title="SevaAlert - Certificate Reminder Service", lifespan=lifespan)

# Serve generated audio files so Twilio can fetch them by public URL
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.post("/reminder/voice-call", response_model=ReminderResponse)
def trigger_voice_reminder(req: ReminderRequest):
    if req.language not in VOICE_TEMPLATES:
        raise HTTPException(
            400,
            f"Unsupported language: {req.language}. Supported: {list(VOICE_TEMPLATES.keys())}",
        )

    # 1. Find nearest center
    try:
        nearest = find_nearest_center(req.latitude, req.longitude)
    except ValueError as e:
        raise HTTPException(500, f"Could not resolve nearest center: {e}")

    # 2. Build the message text
    scheme_clause = build_scheme_clause(req.language, req.eligible_schemes or [])
    message_text = VOICE_TEMPLATES[req.language].format(
        name=req.citizen_name,
        cert=req.certificate_type,
        days=req.days_remaining,
        center=nearest["name"],
        schemes=scheme_clause,
    ).strip()

    # 3. Generate (or fetch cached) audio
    description = VOICE_DESCRIPTIONS[req.language]
    try:
        audio_path = generate_audio(message_text, description, language=req.language)
    except Exception as e:
        logger.exception("Audio generation failed")
        raise HTTPException(500, f"Audio generation failed: {e}")

    audio_filename = os.path.basename(audio_path)
    audio_url = f"{PUBLIC_BASE_URL}/static/audio/{audio_filename}"

    # 4. Place the call
    call_sid = None
    if twilio_client:
        try:
            call = twilio_client.calls.create(
                to=req.phone_number,
                from_=TWILIO_FROM_NUMBER,
                twiml=f'<Response><Play>{audio_url}</Play></Response>',
            )
            call_sid = call.sid
        except Exception as e:
            logger.exception("Twilio call failed")
            raise HTTPException(502, f"Failed to place call via Twilio: {e}")
    else:
        logger.info(
            "[DEV MODE] Twilio not configured — would call %s with audio: %s",
            req.phone_number, audio_url,
        )

    return ReminderResponse(
        status="queued" if call_sid else "dev_mode_no_call_placed",
        audio_url=audio_url,
        nearest_center=nearest,
        call_sid=call_sid,
        mock_mode=(BACKEND == "mock"),
    )


@app.get("/health")
def health():
    return {"status": "ok", "tts_backend": BACKEND, "twilio_configured": twilio_client is not None}
