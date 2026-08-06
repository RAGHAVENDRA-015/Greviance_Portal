from pathlib import Path
from app.core.config import BACKEND_DIR, settings

EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"

CHUNK_SIZE = 800
CHUNK_OVERLAP = 150

VECTOR_DB_PATH = Path(BACKEND_DIR) / "vector_store"

# ── Cache & FAQ configuration (sourced from .env via Settings) ─────────────
FAQ_SIMILARITY_THRESHOLD: float = settings.FAQ_SIMILARITY_THRESHOLD
CACHE_MAX_SIZE: int = settings.CACHE_MAX_SIZE
CACHE_TTL_SECONDS: int = settings.CACHE_TTL_SECONDS