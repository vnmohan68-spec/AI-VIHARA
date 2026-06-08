from fastapi import APIRouter, File, UploadFile, Form, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
import json, re, logging

from app.services.database import get_db
from app.ai.provider import ai_provider
from app.routers.auth import get_optional_user
from app.models.models import User, ScanHistory
from app.services.storage import upload_to_cloudinary

router        = APIRouter()
logger        = logging.getLogger(__name__)
ALLOWED_TYPES = frozenset({"image/jpeg", "image/png", "image/webp", "image/heic"})
MAX_BYTES     = 10 * 1024 * 1024


@router.post("/recognize")
async def recognize_monument(
    image:        UploadFile         = File(...),
    mode:         str                = Form(default="Story Mode"),
    language:     str                = Form(default="English"),
    db:           AsyncSession       = Depends(get_db),
    current_user: User | None        = Depends(get_optional_user),
):
    """
    Monument recognition.
    With API keys → real Qwen2.5-VL vision analysis.
    Without keys → returns demo result with Taj Mahal data + explanation.
    Always returns a useful response.
    """
    if image.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, f"Unsupported type: {image.content_type}. Use JPG, PNG, or WebP.")

    data = await image.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(400, "Image too large — maximum 10 MB.")
    if len(data) < 512:
        raise HTTPException(400, "Image too small or corrupted.")

    # Upload to Cloudinary (best-effort, skip if not configured)
    image_url: str | None = None
    try:
        image_url = await upload_to_cloudinary(data, folder="scans")
    except Exception as exc:
        logger.debug("Cloudinary skip: %s", exc)

    # AI analysis — provider handles offline fallback internally
    try:
        raw    = await ai_provider.analyze_image(data, mode=mode, language=language)
        result = _parse_vision_json(raw)
    except Exception as exc:
        logger.error("Vision error: %s", exc)
        raise HTTPException(500, "Image analysis failed — please try again.")

    if "error" in result and result.get("error") == "not_a_heritage_site":
        return {"success": False, "error": result["error"], "message": result.get("message", "")}

    # If language is non-English, do a second pass to translate narrative fields
    # This guarantees consistent identification regardless of language selection
    if language not in ("English", "en") and not result.get("offline_mode"):
        try:
            result = await _translate_narrative_fields(result, language)
        except Exception as exc:
            logger.debug("Translation pass failed: %s", exc)

    # Persist scan history for authenticated users
    if current_user:
        try:
            db.add(ScanHistory(user_id=current_user.id, image_url=image_url, result_json=result, mode=mode, language=language))
            await db.flush()
        except Exception as exc:
            logger.warning("Scan history persist failed: %s", exc)

    return {"success": True, "image_url": image_url, **result}


@router.get("/history")
async def get_history(
    db: AsyncSession = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    if not current_user:
        return []
    from sqlalchemy import select, desc
    result = await db.execute(
        select(ScanHistory).where(ScanHistory.user_id == current_user.id)
        .order_by(desc(ScanHistory.scanned_at)).limit(20)
    )
    return [{"id": s.id, "image_url": s.image_url, "result": s.result_json, "scanned_at": s.scanned_at}
            for s in result.scalars()]


async def _translate_narrative_fields(result: dict, language: str) -> dict:
    """
    Translate only narrative fields into the target language.
    Keeps name, location, type, best_time, local_food, nearby_places in English
    so that identification is consistent regardless of language selected.
    """
    from app.ai.provider import ai_provider
    from app.ai.prompts import LANG_SUFFIX

    lang_instruction = LANG_SUFFIX.get(language, "")
    if not lang_instruction:
        return result

    # Fields to translate
    narrative = {
        "story":        result.get("story", ""),
        "architecture": result.get("architecture", ""),
        "mythology":    result.get("mythology", ""),
        "photo_tips":   result.get("photo_tips", ""),
        "guide_tip":    result.get("guide_tip", ""),
        "hidden_facts": result.get("hidden_facts", []),
    }

    prompt = (
        f"Translate the following heritage site information into {language}.\n"
        f"Keep place names (temple names, city names) in their original form — do not transliterate them.\n"
        f"Return ONLY valid JSON with the same keys.\n\n"
        f"{lang_instruction}\n\n"
        f"{json.dumps(narrative, ensure_ascii=False)}"
    )

    raw = await ai_provider.chat_completion(
        [{"role": "user", "content": prompt}],
        mode="Guide Mode",
        language=language,
        max_tokens=1200,
    )

    # Parse translated JSON
    import re as _re
    for pat in [r"```(?:json)?\s*(\{.*?\})\s*```", r"(\{.*\})"]:
        m = _re.search(pat, raw, _re.DOTALL)
        if m:
            try:
                translated = json.loads(m.group(1))
                # Merge translated narrative into result, keep structural fields
                for key in ("story", "architecture", "mythology", "photo_tips", "guide_tip"):
                    if key in translated and translated[key]:
                        result[key] = translated[key]
                if "hidden_facts" in translated and isinstance(translated["hidden_facts"], list):
                    result["hidden_facts"] = translated["hidden_facts"]
                return result
            except Exception:
                continue

    return result  # return original if translation parse fails


def _parse_vision_json(raw: str) -> dict:
    """
    Parse JSON from vision model output.
    Handles: markdown fences, bare JSON, Arabic/RTL Unicode, partial matches.
    """
    raw = raw.strip()

    # Strategy 1: extract from markdown code fence
    m = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", raw, re.DOTALL)
    if m:
        try:
            return json.loads(m.group(1))
        except json.JSONDecodeError:
            pass

    # Strategy 2: find outermost { } — handles Unicode including Arabic RTL
    # Use rfind to get the LAST } to handle nested braces correctly
    start = raw.find('{')
    end   = raw.rfind('}')
    if start != -1 and end != -1 and end > start:
        try:
            return json.loads(raw[start:end + 1])
        except json.JSONDecodeError:
            pass

    # Strategy 3: try the whole string
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass

    # Strategy 4: graceful degradation — return partial content as story
    return {
        "name": "Heritage Site", "location": "India", "type": "Cultural Site",
        "confidence": 50,
        "story": raw[:800] if len(raw) > 100 else "Analysis complete.",
        "best_time": "October to March", "local_food": [], "hidden_facts": [],
        "nearby_places": [], "architecture": "", "mythology": "", "photo_tips": "",
    }
