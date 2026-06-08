"""
Planner Router — Vihara AI
Date-aware, hyperlocal, genuinely differentiated from any other travel tool.
"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from typing import List, Optional
import json, re, logging

from app.ai.provider import ai_provider
from app.ai.fallback import _get_offline_itinerary
from app.routers.auth import get_optional_user
from app.models.models import User

router = APIRouter()
logger = logging.getLogger(__name__)


class PlannerRequest(BaseModel):
    destination:  str        = Field(..., min_length=2, max_length=200)
    days:         int        = Field(default=3, ge=1, le=30)
    travelers:    int        = Field(default=2, ge=1, le=50)
    interests:    List[str]  = Field(default_factory=list)
    travel_style: Optional[str] = "cultural"
    language:     str        = Field(default="English")
    start_date:   Optional[str] = None   # "2025-05-18"
    end_date:     Optional[str] = None   # "2025-05-21"


@router.post("/generate")
async def generate_itinerary(
    req: PlannerRequest,
    current_user: User | None = Depends(get_optional_user),
):
    from app.config.settings import settings
    groq_active = bool(settings.GROQ_API_KEY and settings.GROQ_API_KEY.startswith("gsk_"))

    if not groq_active:
        return _get_offline_itinerary(req.destination, req.days)

    interests_str = ", ".join(req.interests) if req.interests else "cultural heritage, hidden gems, local food"

    # Build date context
    date_context = ""
    if req.start_date and req.end_date:
        date_context = f"\nTravel dates: {req.start_date} to {req.end_date}"
        # Parse month for festival/weather context
        try:
            from datetime import datetime
            sd = datetime.strptime(req.start_date, "%Y-%m-%d")
            month_name = sd.strftime("%B")
            date_context += f"\nMonth: {month_name} — include specific weather for this month AND any festivals/events happening in {req.destination} in {month_name}."
        except Exception:
            pass
    elif req.start_date:
        try:
            from datetime import datetime
            sd = datetime.strptime(req.start_date, "%Y-%m-%d")
            month_name = sd.strftime("%B")
            date_context = f"\nTravel month: {month_name} — calibrate weather AND check for festivals in {req.destination} in {month_name}."
        except Exception:
            pass

    lang_instruction = ""
    if req.language != "English":
        lang_instruction = (
            f"\n\nCRITICAL: Write the ENTIRE response in {req.language}. "
            f"Every title, place name description, tip, food recommendation — all in {req.language}."
        )

    prompt = f"""You are Vihara — a deeply knowledgeable local guide for {req.destination}, India.
You know every lane, every temple timing, every crowd pattern, every hidden dish.

Generate a {req.days}-day itinerary for {req.destination}.
Travelers: {req.travelers} | Interests: {interests_str}{date_context}

HYPERLOCAL INTELLIGENCE RULES — every single place tip MUST be one of:

[TIMING] Exact opening hours, which day is closed, best arrival time, puja timings that block entry
Example: "Opens 6 AM. Sanctum closes 12:30–4 PM daily. Arrive by 7 AM to see the abhishekam ritual — no tourists, only devotees."

[CROWD] Specific day + time window when crowds are lowest. Real numbers.
Example: "Saturdays see 3,000 visitors. Tuesday 7–9 AM has under 30. The difference is completely different experience."

[COST] Actual entry fees, camera fee, shoe deposit, guide rate, auto fare from landmark
Example: "Entry ₹50 (Indian) ₹600 (foreigner). Camera ₹50. Shoe deposit ₹5 at gate. Auto from bus stand ₹40 — not the ₹200 touts quote."

[SECRET] One thing 95% of visitors walk past — specific architectural detail, hidden room, lesser-known carving, local ritual
Example: "The 7th pillar from the left in the outer corridor — look for the tiny erotic sculpture deliberately hidden at eye level, facing inward."

Rotate through all 4 types across the day's places. NEVER write generic tips like "wear comfortable shoes" or "carry water".

Return ONLY valid JSON:
{{
  "destination": "{req.destination}",
  "duration": {req.days},
  "travel_dates": "{req.start_date or ''} to {req.end_date or ''}",
  "overview": "4-sentence vivid overview. Include one fact that surprises even Indians.",
  "best_season": "Best months with specific weather + festival reasoning for {req.destination}",
  "budget_estimate": "₹X–Y per person per day split as: Budget (₹X), Mid (₹Y), Premium (₹Z) — what each level gets you specifically in {req.destination}",
  "festival_alert": "Any major festivals, temple events, or local fairs during the travel dates — or null if none",
  "days": [
    {{
      "day": 1,
      "date": "Day 1{f' — {req.start_date}' if req.start_date else ''}",
      "title": "Specific evocative title — not 'Day 1 Exploration'",
      "weather": "Realistic weather description for {req.destination} in this season",
      "temp": "XX–XX°C",
      "travel_tip": "One hyperlocal transport/logistics tip — specific auto route, train number, shortcut, or timing hack only locals know",
      "places": [
        {{
          "name": "Exact official name",
          "time": "7:30 AM",
          "duration": "1.5 hours",
          "type": "Heritage Temple / Fort / Market / Village / etc",
          "significance": 4,
          "tip": "[TIMING/CROWD/COST/SECRET] Specific hyperlocal intelligence — NEVER generic",
          "entry_cost": "₹XX or Free"
        }}
      ],
      "food": [
        "7:00 AM: [Dish] at [Named place / specific street / landmark] — [one sentence on why THIS version is authentic, not tourist]",
        "1:00 PM: [Dish] at [Named dhaba/restaurant] — [what makes it the real local version]",
        "7:30 PM: [Evening dish] — [street name or neighbourhood + what to order + local context]"
      ]
    }}
  ],
  "cultural_notes": "Practical rules for {req.destination} specifically — dress at specific temples, photography restrictions, puja timings, what NOT to do that offends locals here, any date-specific considerations",
  "hidden_gems": [
    "Name (Xkm from centre): One paragraph — what makes it extraordinary + why 99% miss it + exact how to reach",
    "Name (location): Detail",
    "Name (location): Detail",
    "Name (location): Detail",
    "Name (location): Detail"
  ],
  "packing_tips": [
    "Specific to {req.destination} climate/terrain in this season",
    "One practical item most people forget for this destination",
    "Local transport/app tip specific to {req.destination}"
  ]
}}{lang_instruction}"""

    try:
        raw = await ai_provider.chat_completion(
            [{"role": "user", "content": prompt}],
            mode="Quick Facts",
            language=req.language,
            max_tokens=4500,
        )
        itinerary = _extract_json(raw)
        if itinerary:
            logger.info("Itinerary generated for %s", req.destination)
            return {"success": True, "itinerary": itinerary}
        logger.warning("JSON parse failed for %s — falling back", req.destination)
        return _get_offline_itinerary(req.destination, req.days)
    except Exception as exc:
        logger.error("Planner error: %s", exc)
        return _get_offline_itinerary(req.destination, req.days)


@router.get("/weather/{city}")
async def get_weather(city: str):
    import httpx
    from app.config.settings import settings

    if not settings.OPENWEATHER_API_KEY:
        return {"available": False}

    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.get(
                "https://api.openweathermap.org/data/2.5/weather",
                params={"q": city, "appid": settings.OPENWEATHER_API_KEY, "units": "metric"},
            )
            resp.raise_for_status()
            d = resp.json()
            return {
                "available":   True,
                "city":        d["name"],
                "temp":        round(d["main"]["temp"]),
                "feels_like":  round(d["main"]["feels_like"]),
                "description": d["weather"][0]["description"].capitalize(),
                "humidity":    d["main"]["humidity"],
                "wind_speed":  round(d.get("wind", {}).get("speed", 0)),
                "icon":        d["weather"][0]["main"],
            }
    except Exception:
        return {"available": False}


def _extract_json(raw: str) -> dict | None:
    raw = raw.strip()
    for pattern in [r"```(?:json)?\s*(\{.*?\})\s*```", r"(\{.*\})"]:
        m = re.search(pattern, raw, re.DOTALL)
        if m:
            try:
                return json.loads(m.group(1))
            except json.JSONDecodeError:
                continue
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return None
