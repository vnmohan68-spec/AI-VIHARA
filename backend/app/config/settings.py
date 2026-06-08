from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List


class Settings(BaseSettings):
    APP_NAME: str = "Vihara AI"
    DEBUG: bool = False
    SECRET_KEY: str = "change-this-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7

    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "https://vihara-ai.vercel.app",
    ]

    DATABASE_URL: str = "sqlite+aiosqlite:///./vihara.db"
    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_API_KEY: str = ""
    VECTOR_COLLECTION_MONUMENTS: str = "monuments"
    VECTOR_COLLECTION_GEMS: str = "hidden_gems"
    EMBEDDING_MODEL: str = "BAAI/bge-small-en-v1.5"
    EMBEDDING_DIM: int = 384

    # ── Groq (Chat, Planner, Voice) ──────────────────────────────
    # Free → https://console.groq.com → API Keys → Create Key
    GROQ_API_KEY: str = ""

    # ── HuggingFace (Scanner/Vision only) ────────────────────────
    # Free → https://huggingface.co/settings/tokens → New token → Read
    # ALSO accept license: huggingface.co/meta-llama/Llama-3.2-11B-Vision-Instruct
    HUGGINGFACE_API_TOKEN: str = ""

    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""
    GOOGLE_MAPS_API_KEY: str = ""
    OPENWEATHER_API_KEY: str = ""
    REDIS_URL: str = "redis://localhost:6379"
    WHISPER_MODEL: str = "base"
    WHISPER_DEVICE: str = "cpu"

    @field_validator("DEBUG", mode="before")
    @classmethod
    def parse_debug(cls, v):
        if isinstance(v, str) and v.lower() in {"release", "production", "prod"}:
            return False
        return v

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
