from pathlib import Path
from app.core.config import BACKEND_DIR

EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"

CHUNK_SIZE = 800
CHUNK_OVERLAP = 150

VECTOR_DB_PATH = Path(BACKEND_DIR) / "vector_store"