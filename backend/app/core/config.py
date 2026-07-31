from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """Settings loaded from backend/.env regardless of the launch directory."""

    model_config = SettingsConfigDict(env_file=BACKEND_DIR / ".env", extra="ignore")

    MONGODB_URI: str
    DATABASE_NAME: str
    FIREBASE_CREDENTIALS: str
    GEMINI_API_KEY: str
    CLOUDINARY_CLOUD_NAME: str
    CLOUDINARY_API_KEY: str
    CLOUDINARY_API_SECRET: str
    ALLOWED_ORIGINS: str = (
        "http://localhost:3000,http://localhost:5173,"
        "http://127.0.0.1:3000,http://127.0.0.1:5173"
    )
    GOOGLE_MAPS_API_KEY: str | None = None

    @property
    def allowed_origins(self) -> list[str]:
        return [origin.strip().rstrip("/") for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

    @property
    def firebase_credentials_path(self) -> Path:
        path = Path(self.FIREBASE_CREDENTIALS)
        return path if path.is_absolute() else BACKEND_DIR / path


settings = Settings()
