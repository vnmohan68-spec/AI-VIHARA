"""
Voice Router — Vihara AI
Handles: transcription (Whisper) + narration generation + TTS

Each mode produces GENUINELY DIFFERENT content — not just a different tone.
"""
from fastapi import APIRouter, File, UploadFile, Form, Depends, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from typing import Optional
import logging, tempfile, os, httpx

from app.ai.provider import ai_provider
from app.routers.auth import get_optional_user
from app.models.models import User

router = APIRouter()
logger = logging.getLogger(__name__)

_whisper_model = None


def get_whisper():
    global _whisper_model
    if _whisper_model is not None:
        return _whisper_model
    try:
        import whisper
        from app.config.settings import settings
        _whisper_model = whisper.load_model(settings.WHISPER_MODEL, device=settings.WHISPER_DEVICE)
        logger.info("Whisper %s loaded on %s", settings.WHISPER_MODEL, settings.WHISPER_DEVICE)
    except ImportError:
        _whisper_model = "unavailable"
        logger.info("Whisper not installed — voice transcription in text-only mode")
    except Exception as exc:
        _whisper_model = "unavailable"
        logger.warning("Whisper failed to load: %s", exc)
    return _whisper_model


ALLOWED_AUDIO = frozenset({
    "audio/webm", "audio/mpeg", "audio/mp3", "audio/wav",
    "audio/mp4", "audio/ogg", "audio/x-m4a", "audio/aac",
    "audio/flac", "application/octet-stream",
})


# ── Per-mode prompt blueprints ───────────────────────────────────
# Each mode must produce genuinely different OUTPUT — not just tone.
MODE_BLUEPRINTS = {
    "Guide Mode": {
        "persona": (
            "You are a warm, knowledgeable local guide physically walking beside the visitor. "
            "Speak directly as 'you' — conversational, never lecture-style. "
            "Share ONE insider secret, ONE practical tip (where to stand, what to look for), "
            "and ONE thing locals do here that tourists always miss. "
            "Mention a nearby food stop. 300–400 words. No bullets."
        ),
        "format": "Conversational prose, present tense, second-person ('notice how...', 'if you look...')",
    },
    "Story Mode": {
        "persona": (
            "You are a cinematic storyteller. Begin with a single specific sensory scene "
            "set in the past — a sound, a smell, a moment in history. "
            "Then pull the listener through time to the present. "
            "No facts without feeling. 350–450 words. No bullets. "
            "End with one lingering image the visitor will remember."
        ),
        "format": "Cinematic past-tense narrative with present-day resolution",
    },
    "Deep History": {
        "persona": (
            "You are a scholar of Indian history and archaeology. "
            "Give a structured 400–500 word account: founding, key rulers/patrons, "
            "architectural evolution across centuries, significant events, "
            "what was lost and what survives. Use specific dates and names. "
            "Include one lesser-known historical fact even educated visitors miss."
        ),
        "format": "Chronological scholarly narrative with dates, names, events",
    },
    "Mythology": {
        "persona": (
            "You are a storyteller of sacred traditions. "
            "Tell the divine origin story, the presiding deity's significance, "
            "the specific miracles or legends associated with this place, "
            "and what rituals locals still perform here today. "
            "Connect myth to the physical architecture — which carving depicts which story. "
            "300–400 words. Warm and reverent, never academic."
        ),
        "format": "Mythological narrative blending ancient story with living tradition",
    },
    "Quick Facts": {
        "persona": (
            "Give exactly 7 numbered facts about this place. "
            "Each fact must be: surprising, specific, and under 25 words. "
            "Include: founding date, one record it holds, one thing most visitors don't notice, "
            "best visiting time, one local food connection, one architectural detail, one myth. "
            "No intros. No conclusions. Just 7 facts."
        ),
        "format": "7 numbered one-line facts, dense and surprising",
    },
    "Kid's Mode": {
        "persona": (
            "You're telling this to a curious 9-year-old who loves adventures. "
            "Start with 'Did you know...' and an astonishing fact. "
            "Use fun comparisons (as tall as 5 elephants, older than 30 grandpas). "
            "Include one mystery or puzzle about the place. "
            "150–200 words. Simple words. End with a question that makes them look around."
        ),
        "format": "Playful, wonder-filled, simple language with comparisons and a mystery",
    },
}


def _build_narration_prompt(text: str, mode: str, language: str, place: Optional[str] = None) -> tuple[str, str]:
    """
    Build system + user prompt that produces genuinely different narration per mode.
    """
    blueprint = MODE_BLUEPRINTS.get(mode, MODE_BLUEPRINTS["Guide Mode"])

    from app.ai.prompts import LANG_SUFFIX
    lang_instruction = LANG_SUFFIX.get(language, "")
    if lang_instruction:
        lang_instruction = f"\n\nCRITICAL: Write your ENTIRE response in {language}. {lang_instruction}"

    system = (
        f"You are Vihara, India's most culturally intelligent heritage guide.\n\n"
        f"ACTIVE MODE: {mode}\n"
        f"MODE INSTRUCTION: {blueprint['persona']}\n"
        f"OUTPUT FORMAT: {blueprint['format']}"
        f"{lang_instruction}"
    )

    if place:
        user = (
            f"Location: {place}\n"
            f"Visitor said: \"{text}\"\n\n"
            f"Respond to exactly what they asked, in {mode} style, for this specific location."
        )
    else:
        user = (
            f"Visitor said: \"{text}\"\n\n"
            f"If a specific place is mentioned, narrate about THAT place in {mode} style. "
            f"If it's a general question, answer it in {mode} style. "
            f"Be specific — no generic responses."
        )

    return system, user


@router.post("/transcribe")
async def transcribe_audio(
    audio:        UploadFile         = File(...),
    language:     str                = Form(default="en"),
    current_user: User | None        = Depends(get_optional_user),
):
    audio_data = await audio.read()

    if len(audio_data) < 100:
        return {"transcript": "", "error": True, "message": "Audio file is empty or too short."}
    if len(audio_data) > 25 * 1024 * 1024:
        return {"transcript": "", "error": True, "message": "Audio too large — max 25 MB."}

    whisper = get_whisper()
    if whisper == "unavailable":
        # Local Whisper not installed — try Groq Whisper API directly
        ct = (audio.content_type or "").lower()
        suffix_map = {
            "webm": ".webm", "mpeg": ".mp3", "mp3": ".mp3", "wav": ".wav",
            "mp4": ".mp4", "ogg": ".ogg", "m4a": ".m4a", "aac": ".aac",
        }
        suffix = next((v for k, v in suffix_map.items() if k in ct), ".webm")
        groq_tx = await _groq_whisper_transcribe(audio_data, suffix, language)
        if groq_tx:
            return {"transcript": groq_tx, "detected_language": language, "confidence": 0.9}
        return {
            "transcript":        "",
            "detected_language": language,
            "offline":           True,
            "message": (
                "Voice transcription needs Whisper or a GROQ_API_KEY. "
                "Install with: pip install openai-whisper ffmpeg-python\n"
                "Or type your question below — it works the same way."
            ),
        }

    ct = (audio.content_type or "").lower()
    suffix_map = {
        "webm": ".webm", "mpeg": ".mp3", "mp3": ".mp3", "wav": ".wav",
        "mp4": ".mp4", "ogg": ".ogg", "m4a": ".m4a", "aac": ".aac",
    }
    suffix = next((v for k, v in suffix_map.items() if k in ct), ".webm")

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(audio_data)
        tmp_path = tmp.name

    try:
        lang_code = None if language in ("auto", "Auto") else language
        result    = whisper.transcribe(
            tmp_path,
            language=lang_code,
            fp16=False,
            task="transcribe",
        )
        transcript        = result["text"].strip()
        detected_language = result.get("language", language)

        logger.info("Transcribed %d chars in %s", len(transcript), detected_language)

        # Local Whisper returned empty — likely missing ffmpeg or codec issue.
        # Try Groq Whisper API as fallback (handles webm/opus natively).
        if not transcript:
            logger.info("Local Whisper returned empty — trying Groq Whisper fallback")
            groq_tx = await _groq_whisper_transcribe(audio_data, suffix, language)
            if groq_tx:
                return {"transcript": groq_tx, "detected_language": language, "confidence": 0.9}
            # Both failed — return empty so frontend shows the clear error
            return {"transcript": "", "detected_language": language, "confidence": 0.0}

        return {
            "transcript":        transcript,
            "detected_language": detected_language,
            "confidence": round(
                sum(
                    min(1.0, max(0.0, 1.0 + s.get("avg_logprob", -0.5)))
                    for s in result.get("segments", [])
                ) /
                max(len(result.get("segments", [])), 1), 2
            ),
        }

    except Exception as exc:
        logger.error("Whisper error: %s", exc)
        # Try Groq Whisper as fallback on any local Whisper failure
        groq_tx = await _groq_whisper_transcribe(audio_data, suffix, language)
        if groq_tx:
            return {"transcript": groq_tx, "detected_language": language, "confidence": 0.9}
        return {
            "transcript": "",
            "error":      True,
            "message":    f"Transcription failed: {exc}. Please try again.",
        }
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


async def _groq_whisper_transcribe(audio_data: bytes, suffix: str, language: str) -> Optional[str]:
    """
    Fallback: use Groq's Whisper API when local Whisper returns empty or fails.
    Groq supports audio/webm;codecs=opus natively — no ffmpeg needed.
    Free at console.groq.com (same key as chat).
    """
    from app.config.settings import settings
    if not settings.GROQ_API_KEY:
        return None

    # Map language code back to full name for Groq
    # Groq Whisper accepts ISO 639-1 codes
    lang_code = language if len(language) <= 3 else None  # pass through if already a code

    filename = f"recording{suffix}"
    # Determine MIME type from suffix
    mime_map = {
        ".webm": "audio/webm",
        ".mp3": "audio/mpeg",
        ".wav": "audio/wav",
        ".mp4": "audio/mp4",
        ".ogg": "audio/ogg",
        ".m4a": "audio/mp4",
        ".aac": "audio/aac",
        ".flac": "audio/flac",
    }
    mime = mime_map.get(suffix, "audio/webm")

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            files = {"file": (filename, audio_data, mime)}
            data  = {"model": "whisper-large-v3-turbo"}
            if lang_code:
                data["language"] = lang_code
            r = await client.post(
                "https://api.groq.com/openai/v1/audio/transcriptions",
                headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
                files=files,
                data=data,
            )
        if r.status_code == 200:
            text = r.json().get("text", "").strip()
            if text:
                logger.info("[Groq-Whisper] fallback ✓ %d chars", len(text))
            return text or None
        logger.warning("[Groq-Whisper] HTTP %d: %s", r.status_code, r.text[:200])
        return None
    except Exception as exc:
        logger.warning("[Groq-Whisper] fallback error: %s", exc)
        return None


class NarrationRequest(BaseModel):
    text:            str           = Field(..., min_length=1, max_length=3000)
    mode:            str           = Field(default="Guide Mode")
    language:        str           = Field(default="English")
    place:           Optional[str] = None
    witness_prompt:  Optional[str] = None   # Living Witness: full first-person system prompt
    year_context:    Optional[int] = None   # Living Witness: specific year to speak from


@router.post("/narrate")
async def generate_narration(
    req: NarrationRequest,
    current_user: User | None = Depends(get_optional_user),
):
    """
    Generate AI narration from transcribed text or direct query.

    Each mode produces GENUINELY DIFFERENT content:
    - Guide Mode:   conversational, walks with you, insider tips
    - Story Mode:   cinematic, sensory, past→present journey
    - Deep History: scholarly, dates, rulers, architectural evolution
    - Mythology:    divine stories, living rituals, carving-by-carving
    - Quick Facts:  7 surprising numbered facts, dense
    - Kid's Mode:   wonder-filled, comparisons, mystery + question
    """
    # Living Witness mode: use the monument's first-person system prompt directly
    if req.witness_prompt:
        year_str = ""
        if req.year_context:
            year_str = f"The visitor is asking about the year {req.year_context}. Speak from that exact moment."
        system_prompt = req.witness_prompt
        user_prompt = (
            f"{year_str}\n\nVisitor asks: \"{req.text}\"\n\n"
            "Remember: YOU are the monument. Speak in first person. 200-300 words. "
            "Be specific with sounds, smells, textures. End with a question back to the visitor."
        )
    else:
        system_prompt, user_prompt = _build_narration_prompt(
            req.text, req.mode, req.language, req.place
        )

    messages = [{"role": "user", "content": user_prompt}]

    narration = await ai_provider.chat_completion(
        messages,
        mode=req.mode,
        language=req.language,
        max_tokens=1500,
        system_override=system_prompt,
    )

    audio_url = await _generate_tts(narration, req.language)

    return {
        "transcript": narration,
        "text":       narration,
        "audio_url":  audio_url,
        "mode":       req.mode,
        "language":   req.language,
    }


@router.get("/library")
async def get_narration_library():
    """
    Narration library — entries are mode-agnostic starting points.
    The frontend requests narration with the CURRENT mode when an entry is tapped,
    so switching to Mythology and tapping Taj Mahal gives a mythology narration.
    """
    return {
        "featured": [
            {
                "id":       "hampi-01",
                "title":    "Hampi — The Fallen Empire",
                "place":    "Hampi, Karnataka",
                "duration": "4:32",
                "preview":  "In 1336, two brothers stood on the banks of the Tungabhadra River and made a decision that would echo through history for two centuries…",
            },
            {
                "id":       "lepakshi-01",
                "title":    "Lepakshi — Where Gravity Surrenders",
                "place":    "Lepakshi, Andhra Pradesh",
                "duration": "3:18",
                "preview":  "There is a pillar in a 16th-century temple that has been confounding engineers for 500 years. It hangs — suspended — touching nothing below…",
            },
            {
                "id":       "taj-01",
                "title":    "Taj Mahal — A Grief Made Eternal",
                "place":    "Agra, Uttar Pradesh",
                "duration": "5:44",
                "preview":  "She died at 39, giving birth to their fourteenth child. In his grief, Shah Jahan's hair turned white in weeks. What he built next changed architecture forever…",
            },
            {
                "id":       "konark-01",
                "title":    "Konark — Temple of the Sun God",
                "place":    "Puri District, Odisha",
                "duration": "4:10",
                "preview":  "A temple designed as a colossal chariot of the Sun God — 24 intricately carved wheels, each 3 metres tall, frozen at the moment of dawn…",
            },
            {
                "id":       "brihadisvara-01",
                "title":    "Brihadisvara — The Living Temple",
                "place":    "Thanjavur, Tamil Nadu",
                "duration": "3:55",
                "preview":  "The shadow of the vimana tower never falls on the ground at noon. This was intentional. The Chola king who built it in 1010 AD left clues everywhere…",
            },
            {
                "id":       "varanasi-01",
                "title":    "Varanasi — Where Time Stands Still",
                "place":    "Varanasi, Uttar Pradesh",
                "duration": "5:10",
                "preview":  "The oldest continuously inhabited city on earth. When this city was already ancient, Rome had not yet been founded. Every ghat holds a different story…",
            },
        ],
    }


@router.get("/audio/{filename}")
async def serve_audio(filename: str):
    safe_name = os.path.basename(filename)
    if not safe_name.startswith("vihara_") or not safe_name.endswith(".mp3"):
        raise HTTPException(status_code=400, detail="Invalid audio filename")

    path = f"/tmp/{safe_name}"
    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="Audio file not found or expired")

    return FileResponse(
        path,
        media_type="audio/mpeg",
        headers={"Cache-Control": "no-cache"},
    )


async def _generate_tts(text: str, language: str = "English") -> Optional[str]:
    """Generate TTS via edge-tts. All 15 languages supported."""
    try:
        import edge_tts, uuid
        VOICE_MAP = {
            "English":   "en-IN-NeerjaNeural",
            "Hindi":     "hi-IN-SwaraNeural",
            "Telugu":    "te-IN-ShrutiNeural",
            "Tamil":     "ta-IN-PallaviNeural",
            "Bengali":   "bn-IN-TanishaaNeural",
            "Kannada":   "kn-IN-SapnaNeural",
            "Gujarati":  "gu-IN-DhwaniNeural",
            "Marathi":   "mr-IN-AarohiNeural",
            "Malayalam": "ml-IN-SobhanaNeural",
            "French":    "fr-FR-DeniseNeural",
            "German":    "de-DE-KatjaNeural",
            "Spanish":   "es-ES-ElviraNeural",
            "Japanese":  "ja-JP-NanamiNeural",
            "Chinese":   "zh-CN-XiaoxiaoNeural",
            "Arabic":    "ar-SA-ZariyahNeural",
        }
        voice       = VOICE_MAP.get(language, "en-IN-NeerjaNeural")
        out_path    = f"/tmp/vihara_{uuid.uuid4().hex[:8]}.mp3"
        communicate = edge_tts.Communicate(text[:3000], voice)
        await communicate.save(out_path)
        logger.info("TTS generated: %s (%s)", out_path, voice)
        return f"/api/v1/voice/audio/{os.path.basename(out_path)}"
    except ImportError:
        return None
    except Exception as exc:
        logger.debug("TTS skip: %s", exc)
        return None


@router.get("/test-language/{language}")
async def test_language_output(language: str):
    """
    Debug endpoint — verifies the full language pipeline.
    GET /api/v1/voice/test-language/Telugu
    Returns: what AI would say, in that language, with TTS url.
    """
    test_text = f"Say exactly 2 sentences introducing yourself as Vihara in {language}."
    system, user = _build_narration_prompt(test_text, "Guide Mode", language)

    try:
        narration = await ai_provider.chat_completion(
            [{"role": "user", "content": user}],
            mode="Guide Mode",
            language=language,
            max_tokens=200,
            system_override=system,
        )
    except Exception as e:
        narration = f"[AI error: {e}]"

    audio_url = await _generate_tts(narration, language)

    from app.ai.prompts import LANG_SUFFIX
    return {
        "language":        language,
        "lang_instruction": LANG_SUFFIX.get(language, "none"),
        "narration_text":  narration,
        "audio_url":       audio_url,
        "tts_voice":       {
            "English":"en-IN-NeerjaNeural","Hindi":"hi-IN-SwaraNeural",
            "Telugu":"te-IN-ShrutiNeural","Tamil":"ta-IN-PallaviNeural",
            "Bengali":"bn-IN-TanishaaNeural","Kannada":"kn-IN-SapnaNeural",
            "Gujarati":"gu-IN-DhwaniNeural","Marathi":"mr-IN-AarohiNeural",
            "Malayalam":"ml-IN-SobhanaNeural","French":"fr-FR-DeniseNeural",
            "German":"de-DE-KatjaNeural","Spanish":"es-ES-ElviraNeural",
            "Japanese":"ja-JP-NanamiNeural","Chinese":"zh-CN-XiaoxiaoNeural",
            "Arabic":"ar-SA-ZariyahNeural",
        }.get(language, "en-IN-NeerjaNeural"),
        "pipeline": [
            "1. Whisper transcribes speech in selected language",
            f"2. AI system prompt includes: {LANG_SUFFIX.get(language, 'no instruction')}",
            "3. AI generates narration in that language",
            f"4. edge-tts speaks using language-specific neural voice",
        ],
    }
