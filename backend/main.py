from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
import logging
import os

from app.config.settings import settings
from app.middleware.logging import LoggingMiddleware, RateLimitMiddleware
from app.routers import auth, monuments, chat, voice, planner, gems, saved
from app.services.database import init_db
from app.services.vectordb import init_vector_db

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 Vihara AI starting…")
    await init_db()
    try:
        await init_vector_db()
    except Exception as exc:
        logger.warning("⚠️  Vector DB skipped: %s", exc)

    groq_ok = bool(settings.GROQ_API_KEY and settings.GROQ_API_KEY.startswith("gsk_"))
    hf_ok   = bool(settings.HUGGINGFACE_API_TOKEN and settings.HUGGINGFACE_API_TOKEN.startswith("hf_"))

    logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    logger.info("  Groq  (Chat/Planner/Voice): %s", "✅ ACTIVE" if groq_ok else "❌ MISSING — add GROQ_API_KEY to .env")
    logger.info("  HF    (Scanner/Vision):     %s", "✅ ACTIVE" if hf_ok   else "❌ MISSING — add HUGGINGFACE_API_TOKEN to .env")
    logger.info("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    logger.info("✅ API ready")
    yield
    logger.info("🔻 Shutting down")


app = FastAPI(
    title="Vihara AI",
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

app.add_middleware(CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(LoggingMiddleware)
app.add_middleware(RateLimitMiddleware)

P = "/api/v1"
app.include_router(auth.router,      prefix=P + "/auth",      tags=["Auth"])
app.include_router(monuments.router, prefix=P + "/monuments",  tags=["Monuments"])
app.include_router(chat.router,      prefix=P + "/chat",       tags=["Chat"])
app.include_router(voice.router,     prefix=P + "/voice",      tags=["Voice"])
app.include_router(planner.router,   prefix=P + "/planner",    tags=["Planner"])
app.include_router(gems.router,      prefix=P + "/gems",       tags=["Gems"])
app.include_router(saved.router,     prefix=P + "/saved",      tags=["Saved"])


@app.get("/health")
async def health():
    return {"status": "ok", "service": "Vihara AI"}


@app.get("/api/v1/status")
async def status():
    groq_ok = bool(settings.GROQ_API_KEY and settings.GROQ_API_KEY.startswith("gsk_"))
    hf_ok   = bool(settings.HUGGINGFACE_API_TOKEN and settings.HUGGINGFACE_API_TOKEN.startswith("hf_"))
    return {
        "groq":  "✅ active" if groq_ok else "❌ missing GROQ_API_KEY",
        "hf":    "✅ active" if hf_ok   else "❌ missing HUGGINGFACE_API_TOKEN",
    }


@app.get("/api/v1/config")
async def public_config():
    return {
        "google_maps_key": settings.GOOGLE_MAPS_API_KEY or "",
        "has_weather":     bool(settings.OPENWEATHER_API_KEY),
        "has_groq":        bool(settings.GROQ_API_KEY and settings.GROQ_API_KEY.startswith("gsk_")),
    }


# ── Serve React frontend (must be LAST) ──────────────────────────
DIST = os.path.join(os.path.dirname(__file__), "dist")

if os.path.exists(DIST):
    app.mount("/assets", StaticFiles(directory=os.path.join(DIST, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        index = os.path.join(DIST, "index.html")
        return FileResponse(index)
