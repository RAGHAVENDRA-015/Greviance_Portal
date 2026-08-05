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

    @property
    def allowed_origins(self) -> List[str]:
        return [
            origin.strip().rstrip("/")
            for origin in self.ALLOWED_ORIGINS.split(",")
            if origin.strip()
        ]


settings = Settings()

