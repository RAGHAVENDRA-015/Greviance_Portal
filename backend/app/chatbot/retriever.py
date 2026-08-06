import logging
from typing import List, Optional, Tuple
from langchain_core.documents import Document

from app.chatbot.vector_store import FAISSVectorStore

logger = logging.getLogger(__name__)


class KnowledgeRetriever:
    """
    RAG retriever for querying portal documentation.
    Vector store is lazily initialized on the first query.
    """

    def __init__(self, vector_store: Optional[FAISSVectorStore] = None):
        self._vector_store = vector_store
        self._query_cache: dict[str, List[Document]] = {}
        self._max_cache_size: int = 128

    @property
    def vector_store(self) -> FAISSVectorStore:
        """Lazily initialize FAISSVectorStore."""
        if self._vector_store is None:
            self._vector_store = FAISSVectorStore()
        return self._vector_store

    def retrieve(
        self,
        query: str,
        k: int = 8,
    ) -> List[Document]:
        """Retrieve relevant knowledge documents for a query string with caching."""
        cache_key = f"{query.strip().lower()}:{k}"
        if cache_key in self._query_cache:
            logger.debug("KnowledgeRetriever cache hit for query: %r", query)
            return self._query_cache[cache_key]

        docs = self.vector_store.similarity_search(
            query=query,
            k=k,
        )

        if len(self._query_cache) >= self._max_cache_size:
            # Evict oldest entry
            oldest_key = next(iter(self._query_cache))
            self._query_cache.pop(oldest_key, None)

        self._query_cache[cache_key] = docs
        return docs

    def retrieve_with_scores(
        self,
        query: str,
        k: int = 8,
    ) -> List[Tuple[Document, float]]:
        """Retrieve relevant knowledge documents with similarity scores."""
        return self.vector_store.similarity_search_with_score(
            query=query,
            k=k,
        )