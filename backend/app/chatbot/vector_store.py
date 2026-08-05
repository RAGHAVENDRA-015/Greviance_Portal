import gc
import logging
import threading
from pathlib import Path
from typing import Any, List, Optional, Tuple

from app.chatbot.config import VECTOR_DB_PATH
from app.chatbot.embeddings import EmbeddingModel

logger = logging.getLogger(__name__)


class FAISSVectorStore:
    """
    Manages local FAISS vector store creation, persistence, and querying.
    Defers FAISS import and index loading until required by a knowledge search.
    """

    _instance_lock = threading.Lock()

    def __init__(self, index_path: Optional[Path] = None):
        self.index_path = Path(index_path or VECTOR_DB_PATH)
        self.db: Optional[Any] = None

    def get_embedding(self):
        """Retrieve the singleton embedding model."""
        return EmbeddingModel.get_embeddings()

    def create(self, documents: List[Any]):
        """Create a new FAISS vector database from document chunks."""
        from langchain_community.vectorstores import FAISS

        logger.info("Creating FAISS index from %d documents...", len(documents))
        db = FAISS.from_documents(
            documents=documents,
            embedding=self.get_embedding(),
        )
        self.db = db
        return db

    def save(self, vector_store: Any) -> None:
        """Save the vector store to disk."""
        self.index_path.mkdir(parents=True, exist_ok=True)
        vector_store.save_local(str(self.index_path))
        logger.info("Saved FAISS index to %s", self.index_path)

    def load(self):
        """
        Lazily load the persisted FAISS index with thread safety and validation.
        """
        if self.db is None:
            with self._instance_lock:
                if self.db is None:
                    faiss_file = self.index_path / "index.faiss"
                    pkl_file = self.index_path / "index.pkl"

                    if not (faiss_file.exists() and pkl_file.exists()):
                        logger.warning(
                            "FAISS index files not found in %s. Creating empty vector store fallback.",
                            self.index_path,
                        )
                        from langchain_community.vectorstores import FAISS
                        from langchain_core.documents import Document

                        self.db = FAISS.from_documents(
                            [Document(page_content="Grievance portal knowledge base placeholder.", metadata={"document_name": "portal.md"})],
                            self.get_embedding(),
                        )
                        return self.db

                    from langchain_community.vectorstores import FAISS

                    logger.info("Loading FAISS index from %s", self.index_path)
                    self.db = FAISS.load_local(
                        folder_path=str(self.index_path),
                        embeddings=self.get_embedding(),
                        allow_dangerous_deserialization=True,
                    )
                    gc.collect()
                    logger.info("FAISS index loaded successfully.")

        return self.db

    def similarity_search(self, query: str, k: int = 5) -> List[Any]:
        """Perform similarity search for a query string."""
        return self.load().similarity_search(query=query, k=k)

    def similarity_search_with_score(self, query: str, k: int = 5) -> List[Tuple[Any, float]]:
        """Perform similarity search with distance scores."""
        return self.load().similarity_search_with_score(query=query, k=k)