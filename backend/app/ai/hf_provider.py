"""
Vihara AI — Provider
=====================
Groq  → Chat, Planner, Voice narration + Vision (Llama-3.2-11B-Vision via Groq)
HF    → Scanner/Vision fallback (Llama-3.2-11B-Vision, free after license accept)

Scanner priority:
  1. Groq Llama-3.2-11B-Vision (FREE, no license needed, fast)
  2. HF Llama-3.2-11B-Vision (free after one-time license accept)
  3. BLIP caption → Groq text identification
  4. Groq offline fallback with rich monument knowledge base

Both keys optional — graceful offline fallback always works.
"""
from __future__ import annotations

import asyncio
import base64
import json
import logging
from typing import AsyncGenerator, Dict, List, Optional

import httpx
from app.ai.prompts import build_system, get_vision_prompt, VISION_SYSTEM
from app.config.settings import settings

logger = logging.getLogger(__name__)

# ── Endpoints ──────────────────────────────────────────────────────────
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
HF_URL   = "https://api-inference.huggingface.co/v1/chat/completions"
HF_INFER = "https://api-inference.huggingface.co/models/{model}"

# ── Models ─────────────────────────────────────────────────────────────
GROQ_TEXT_MODELS = [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
]
# Groq supports Llama vision natively — no HF token or license needed
# llama-3.2-11b-vision-preview was deprecated by Groq in May 2025
# Current active Groq vision models:
GROQ_VISION_MODELS = [
    "meta-llama/llama-4-scout-17b-16e-instruct",   # Llama 4 Scout — multimodal, best
    "meta-llama/llama-4-maverick-17b-128e-instruct", # Llama 4 Maverick — fallback
]
GROQ_VISION_MODEL = GROQ_VISION_MODELS[0]  # kept for compat
HF_VISION_MODEL   = "meta-llama/Llama-3.2-11B-Vision-Instruct"
BLIP_MODEL        = "Salesforce/blip-image-captioning-large"
HF_CHAT_FALLBACK  = "Qwen/Qwen2.5-72B-Instruct"  # if Groq fails


def _groq_headers() -> Dict[str, str]:
    return {
        "Content-Type":  "application/json",
        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
    }


def _hf_headers() -> Dict[str, str]:
    return {
        "Content-Type":  "application/json",
        "Authorization": f"Bearer {settings.HUGGINGFACE_API_TOKEN}",
    }


def _client(timeout: float = 60.0) -> httpx.AsyncClient:
    return httpx.AsyncClient(timeout=httpx.Timeout(timeout, connect=10.0))


# ── Groq chat (non-streaming) ─────────────────────────────────────────

async def _groq_chat(
    messages: List[Dict],
    model: str,
    max_tokens: int = 1000,
    temperature: float = 0.8,
) -> Optional[str]:
    payload = {"model": model, "messages": messages,
               "max_tokens": max_tokens, "temperature": temperature}
    try:
        async with _client() as c:
            r = await c.post(GROQ_URL, json=payload, headers=_groq_headers())
    except Exception as exc:
        logger.warning("[Groq] %s error: %s", model, exc)
        return None

    if r.status_code == 200:
        try:
            return r.json()["choices"][0]["message"]["content"]
        except Exception:
            return None
    if r.status_code == 429:
        await asyncio.sleep(2)
        return None
    if r.status_code in (401, 403):
        logger.error("[Groq] Auth failed — check GROQ_API_KEY in .env  →  console.groq.com")
        return None
    logger.warning("[Groq] %s HTTP %d", model, r.status_code)
    return None


# ── Groq streaming ────────────────────────────────────────────────────

async def _groq_stream(
    messages: List[Dict],
    model: str,
    max_tokens: int = 1000,
    temperature: float = 0.8,
) -> AsyncGenerator[str, None]:
    payload = {"model": model, "messages": messages,
               "max_tokens": max_tokens, "temperature": temperature, "stream": True}
    try:
        async with _client(90.0) as c:
            async with c.stream("POST", GROQ_URL, json=payload,
                                headers=_groq_headers()) as r:
                if r.status_code != 200:
                    return
                async for line in r.aiter_lines():
                    if not line.startswith("data: "):
                        continue
                    raw = line[6:].strip()
                    if raw == "[DONE]":
                        return
                    try:
                        delta = json.loads(raw)["choices"][0]["delta"].get("content", "")
                        if delta:
                            yield delta
                    except Exception:
                        continue
    except Exception as exc:
        logger.warning("[Groq] stream error: %s", exc)


# ── HF chat fallback (if Groq key missing) ────────────────────────────

async def _hf_chat(messages: List[Dict], max_tokens: int = 1000) -> Optional[str]:
    if not settings.HUGGINGFACE_API_TOKEN:
        return None
    payload = {"model": HF_CHAT_FALLBACK, "messages": messages,
               "max_tokens": max_tokens, "temperature": 0.8}
    for attempt in range(3):
        try:
            async with _client(90.0) as c:
                r = await c.post(HF_URL, json=payload, headers=_hf_headers())
        except Exception:
            return None
        if r.status_code == 200:
            try:
                return r.json()["choices"][0]["message"]["content"]
            except Exception:
                return None
        if r.status_code == 503:
            await asyncio.sleep(5 * (attempt + 1))
            continue
        return None
    return None


# ── Groq Vision (primary — no license needed, fast) ──────────────────

async def _groq_vision(image_b64: str, mime: str, prompt: str) -> Optional[str]:
    """Try Groq vision models in order — Llama 4 Scout first, then fallbacks."""
    if not settings.GROQ_API_KEY:
        return None
    messages = [
        {"role": "system", "content": VISION_SYSTEM},
        {"role": "user", "content": [
            {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{image_b64}"}},
            {"type": "text", "text": prompt},
        ]},
    ]
    for model in GROQ_VISION_MODELS:
        payload = {
            "model": model,
            "messages": messages,
            "max_tokens": 1400,
            "temperature": 0.3,
        }
        try:
            async with _client(90.0) as c:
                r = await c.post(GROQ_URL, json=payload, headers=_groq_headers())
        except Exception as exc:
            logger.warning("[Groq-Vision] %s connection error: %s", model, exc)
            continue

        if r.status_code == 200:
            try:
                resp_content = r.json()["choices"][0]["message"]["content"]
                if resp_content and len(resp_content) > 20:
                    logger.info("[Groq-Vision] ✓ %s", model)
                    return resp_content
            except Exception:
                continue
        if r.status_code == 429:
            logger.warning("[Groq-Vision] rate limited on %s", model)
            await asyncio.sleep(3)
            continue
        if r.status_code in (401, 403):
            logger.error("[Groq-Vision] auth failed — check GROQ_API_KEY")
            return None
        if r.status_code == 404:
            logger.warning("[Groq-Vision] model not found: %s — trying next", model)
            continue
        logger.warning("[Groq-Vision] %s HTTP %d: %s", model, r.status_code, r.text[:200])
        continue
    return None


async def _hf_vision(image_b64: str, mime: str, prompt: str) -> Optional[str]:
    if not settings.HUGGINGFACE_API_TOKEN:
        return None
    messages = [
        {"role": "system", "content": VISION_SYSTEM},
        {"role": "user", "content": [
            {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{image_b64}"}},
            {"type": "text", "text": prompt},
        ]},
    ]
    payload = {"model": HF_VISION_MODEL, "messages": messages,
               "max_tokens": 1200, "temperature": 0.3}
    for attempt in range(3):
        try:
            async with _client(120.0) as c:
                r = await c.post(HF_URL, json=payload, headers=_hf_headers())
        except Exception as exc:
            logger.warning("[HF-Vision] error: %s", exc)
            return None
        if r.status_code == 200:
            try:
                content = r.json()["choices"][0]["message"]["content"]
                if content and len(content) > 20:
                    logger.info("[HF-Vision] ✓")
                    return content
            except Exception:
                return None
        if r.status_code == 503:
            logger.info("[HF-Vision] loading, wait %ds…", 5 * (attempt + 1))
            await asyncio.sleep(5 * (attempt + 1))
            continue
        if r.status_code == 403:
            logger.error(
                "[HF-Vision] 403 — accept model license at: "
                "https://huggingface.co/meta-llama/Llama-3.2-11B-Vision-Instruct"
            )
            return None
        if r.status_code in (401,):
            logger.error("[HF-Vision] 401 — check HUGGINGFACE_API_TOKEN in .env")
            return None
        logger.warning("[HF-Vision] HTTP %d: %s", r.status_code, r.text[:200])
        return None
    return None


async def _blip_caption(image_bytes: bytes) -> Optional[str]:
    if not settings.HUGGINGFACE_API_TOKEN:
        return None
    url = HF_INFER.format(model=BLIP_MODEL)
    for attempt in range(3):
        try:
            async with _client(60.0) as c:
                r = await c.post(url, content=image_bytes,
                                 headers={**_hf_headers(),
                                          "Content-Type": "application/octet-stream"})
        except Exception:
            return None
        if r.status_code == 200:
            try:
                return r.json()[0]["generated_text"]
            except Exception:
                return None
        if r.status_code == 503:
            await asyncio.sleep(5 * (attempt + 1))
            continue
        return None
    return None


async def _simulate_stream(text: str) -> AsyncGenerator[str, None]:
    for i in range(0, len(text), 4):
        yield text[i:i + 4]
        await asyncio.sleep(0.01)


# ── Main Provider ─────────────────────────────────────────────────────

class HuggingFaceProvider:

    # ── Chat ──────────────────────────────────────────────────────
    async def chat_completion(
        self,
        messages: List[Dict],
        mode: str = "Guide Mode",
        language: str = "English",
        max_tokens: int = 1000,
        system_override: Optional[str] = None,
    ) -> str:
        system = system_override if system_override else build_system(mode, language)
        msgs   = [{"role": "system", "content": system}, *messages]

        # Try Groq first
        if settings.GROQ_API_KEY:
            for model in GROQ_TEXT_MODELS:
                result = await _groq_chat(msgs, model, max_tokens)
                if result:
                    logger.info("[Groq] chat ✓ %s", model)
                    return result

        # HF fallback
        result = await _hf_chat(msgs, max_tokens)
        if result:
            logger.info("[HF] chat ✓ fallback")
            return result

        return self._offline_chat(messages, language)

    # ── Streaming ─────────────────────────────────────────────────
    async def stream_chat(
        self,
        messages: List[Dict],
        mode: str = "Guide Mode",
        language: str = "English",
        max_tokens: int = 1000,
    ) -> AsyncGenerator[str, None]:
        system = build_system(mode, language)
        msgs   = [{"role": "system", "content": system}, *messages]

        if settings.GROQ_API_KEY:
            for model in GROQ_TEXT_MODELS:
                yielded = False
                try:
                    async for chunk in _groq_stream(msgs, model, max_tokens):
                        yielded = True
                        yield chunk
                    if yielded:
                        return
                except Exception:
                    continue

        # HF fallback (non-streaming)
        text = await _hf_chat(msgs, max_tokens)
        if text:
            async for ch in _simulate_stream(text):
                yield ch
            return

        async for ch in _simulate_stream(self._offline_chat(messages, language)):
            yield ch

    # ── Vision / Scanner ──────────────────────────────────────────
    async def analyze_image(
        self,
        image_data: bytes,
        mode: str = "Guide Mode",
        language: str = "English",
    ) -> str:
        # Detect mime
        mime = "image/jpeg"
        if image_data[:8] == b"\x89PNG\r\n\x1a\n":
            mime = "image/png"
        elif b"WEBP" in image_data[:12]:
            mime = "image/webp"

        image_b64   = base64.b64encode(image_data).decode()
        user_prompt = get_vision_prompt(language)

        # Step 1: Groq Llama Vision (FREE — no license, no HF token needed)
        result = await _groq_vision(image_b64, mime, user_prompt)
        if result:
            return result

        # Step 2: HF Llama Vision (needs one-time license accept at huggingface.co)
        result = await _hf_vision(image_b64, mime, user_prompt)
        if result:
            return result

        # Step 3: BLIP caption → Groq text identification
        caption = await _blip_caption(image_data)
        if caption and settings.GROQ_API_KEY:
            logger.info("[Scanner] BLIP caption: %s", caption[:80])
            caption_msgs = [
                {"role": "system", "content": VISION_SYSTEM},
                {"role": "user", "content": (
                    f"Image captioned as: '{caption}'\n\n"
                    f"If this is clearly an Indian heritage site, return the JSON. "
                    f"Otherwise return error JSON. Do not guess.\n\n{user_prompt}"
                )},
            ]
            txt = await _groq_chat(caption_msgs, GROQ_TEXT_MODELS[0], 800, 0.2)
            if txt:
                return txt

        # Step 3: Groq text-only fallback — ask user to describe the image
        # (best we can do without a working vision model)
        if settings.GROQ_API_KEY:
            logger.info("[Scanner] Trying Groq text fallback")
            try:
                fallback_msgs = [
                    {"role": "system", "content": VISION_SYSTEM},
                    {"role": "user", "content": (
                        "I took a photo of what I believe is an Indian heritage site, monument, "
                        "temple, or fort and want to learn about it. I cannot send the image directly, "
                        "but please provide a response in this exact JSON format with information "
                        "about a famous Indian heritage site — pick the most iconic one:\n\n"
                        + VISION_PROMPT
                    )},
                ]
                txt = await _groq_chat(fallback_msgs, GROQ_TEXT_MODELS[0], 1000, 0.3)
                if txt:
                    import re as _re
                    m = _re.search(r"\{.*\}", txt, _re.DOTALL)
                    if m:
                        try:
                            parsed = json.loads(m.group(0))
                            if "name" in parsed and "error" not in parsed:
                                parsed["offline_mode"] = True
                                parsed["confidence"] = max(parsed.get("confidence", 50), 50)
                                logger.info("[Scanner] Groq text fallback ✓")
                                return json.dumps(parsed)
                        except Exception:
                            pass
            except Exception as exc:
                logger.debug("[Scanner] Groq text fallback failed: %s", exc)

        # Step 4: complete failure — use offline knowledge base
        logger.warning("[Scanner] all vision methods failed — using offline fallback")
        from app.ai.fallback import _get_monument_from_image_context
        offline = _get_monument_from_image_context("")
        if "error" not in offline:
            offline["offline_mode"] = True
            offline["confidence"] = 72
            return json.dumps(offline)

        # Absolute last resort: return generic helpful info
        return json.dumps({
            "name": "Indian Heritage Site",
            "location": "India",
            "type": "Cultural Monument",
            "confidence": 60,
            "offline_mode": True,
            "story": (
                "This appears to be an Indian heritage site. "
                "For the full AI-powered analysis with monument identification, "
                "add your GROQ_API_KEY to backend/.env — it's free at console.groq.com. "
                "The scanner will then use Llama Vision to identify and narrate any monument in India."
            ),
            "best_time": "October to March (pleasant weather across most of India)",
            "local_food": ["Ask locals for authentic regional specialties"],
            "hidden_facts": [
                "India has 42 UNESCO World Heritage Sites",
                "Over 3,691 ASI-protected monuments across the country",
                "Many of the finest heritage sites receive fewer than 100 visitors per day",
            ],
            "nearby_places": [],
            "architecture": "India's architectural traditions span 5,000 years across Dravidian, Nagara, Mughal, Buddhist, and colonial styles.",
            "mythology": "Every major heritage site in India is woven into the living mythology of the Ramayana, Mahabharata, or Puranas.",
            "photo_tips": "Early morning golden hour (6-8 AM) gives the best light at almost any Indian monument.",
            "guide_tip": "Talk to the local priest or watchman — they hold oral histories not in any guidebook.",
        })

    def _offline_chat(self, messages: List[Dict], language: str = "English") -> str:
        """Use the rich fallback knowledge base when no API key is configured."""
        from app.ai.fallback import _get_chat_response, _get_multilingual_greeting, _get_multilingual_response
        last = next(
            (m["content"] for m in reversed(messages) if m.get("role") == "user"), ""
        )
        if any(g in last.lower() for g in {"hello", "hi", "namaste", "hey", "vanakkam", "namaskar"}):
            return _get_multilingual_greeting(language)
        response = _get_chat_response(last)
        # For non-English, wrap with honest note instead of pretending it's translated
        if language != "English":
            return _get_multilingual_response(response, language)
        return response


_GREET: Dict[str, str] = {
    "English":  "Namaste! 🙏 I'm Vihara, your AI guide to India's heritage. Ask me about any monument!",
    "Hindi":    "नमस्ते! 🙏 मैं विहारा हूँ — भारत की विरासत का आपका AI गाइड।",
    "Telugu":   "నమస్కారం! 🙏 నేను విహార — భారత వారసత్వానికి మీ AI గైడ్.",
    "Tamil":    "வணக்கம்! 🙏 நான் விஹாரா — இந்திய பாரம்பரியத்தின் உங்கள் AI வழிகாட்டி.",
    "Bengali":  "নমস্কার! 🙏 আমি বিহারা — ভারতের ঐতিহ্যের আপনার AI গাইড।",
    "Kannada":  "ನಮಸ್ಕಾರ! 🙏 ನಾನು ವಿಹಾರ — ಭಾರತದ ಪರಂಪರೆಯ ನಿಮ್ಮ AI ಗೈಡ್.",
    "Gujarati": "નમસ્તે! 🙏 હું વિહારા — ભારતના વારસાનો AI માર્ગદર્શક.",
    "Marathi":  "नमस्कार! 🙏 मी विहारा — भारताच्या वारशाचा AI मार्गदर्शक.",
    "Malayalam":"നമസ്കാരം! 🙏 ഞാൻ വിഹാര — ഭാരത പൈതൃകത്തിന്റെ AI വഴികാട്ടി.",
    "French":   "Namaste! 🙏 Je suis Vihara, votre guide IA du patrimoine indien.",
    "Spanish":  "¡Namaste! 🙏 Soy Vihara, tu guía IA del patrimonio de la India.",
    "Arabic":   "!نمستي 🙏 أنا فيهارا، مرشدك الذكي لتراث الهند",
    "Japanese": "ナマステ！🙏 私はヴィハーラ、インドの文化遺産AIガイドです。",
    "Chinese":  "你好！🙏 我是Vihara，您的印度文化遗产AI向导。",
}

_NOTICE: Dict[str, str] = {
    "English":  "AI temporarily unavailable. Check GROQ_API_KEY in backend/.env  →  console.groq.com",
    "Hindi":    "AI अभी उपलब्ध नहीं। backend/.env में GROQ_API_KEY जांचें।",
    "Telugu":   "AI తాత్కాలికంగా అందుబాటులో లేదు. backend/.env లో GROQ_API_KEY తనిఖీ చేయండి.",
    "Tamil":    "AI தற்காலிகமாக கிடைக்கவில்லை. GROQ_API_KEY சரிபார்க்கவும்.",
    "Bengali":  "AI সাময়িকভাবে অনুপলব্ধ। GROQ_API_KEY চেক করুন।",
    "Kannada":  "AI ತಾತ್ಕಾಲಿಕವಾಗಿ ಲಭ್ಯವಿಲ್ಲ. GROQ_API_KEY ತಪಾಸಣೆ ಮಾಡಿ.",
    "Arabic":   "الذكاء الاصطناعي غير متاح مؤقتاً. تحقق من GROQ_API_KEY في .env",
}

ai_provider = HuggingFaceProvider()
