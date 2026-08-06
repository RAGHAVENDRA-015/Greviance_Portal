from pathlib import Path
from typing import List, Optional

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables and/or backend/.env.
    """

    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    MONGODB_URI: str = ""
    DATABASE_NAME: str = "grievance_portal"
    FIREBASE_CREDENTIALS: str = ""
    GEMINI_API_KEY: str = ""
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""
    ALLOWED_ORIGINS: str = (
        "http://localhost:3000,"
        "http://localhost:5173,"
        "http://127.0.0.1:3000,"
        "http://127.0.0.1:5173,"
        "https://greviance-portal-kappa.vercel.app"
    )
    GOOGLE_MAPS_API_KEY: Optional[str] = None
    HF_TOKEN: Optional[str] = None

    # ── Caching & FAQ Configuration ────────────────────────────────────
    FAQ_SIMILARITY_THRESHOLD: float = 0.90
    CACHE_MAX_SIZE: int = 500
    CACHE_TTL_SECONDS: int = 86400  # 24 hours

    # ── Debug / Observability ─────────────────────────────────────────
    DEBUG: bool = False

    # ── FAQ data file path (relative to BACKEND_DIR or absolute) ──────
    FAQ_DATA_PATH: str = "app/data/faqs.json"

    @property
    def allowed_origins(self) -> List[str]:
        origins = [
            origin.strip().rstrip("/")
            for origin in self.ALLOWED_ORIGINS.split(",")
            if origin.strip()
        ]
        default_vercel = "https://greviance-portal-kappa.vercel.app"
        if default_vercel not in origins:
            origins.append(default_vercel)
        return origins

    @property
    def faq_data_path_resolved(self) -> Path:
        """Return the absolute path to the FAQ data file."""
        p = Path(self.FAQ_DATA_PATH)
        if p.is_absolute():
            return p
        return BACKEND_DIR / p


settings = Settings()

