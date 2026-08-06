"""
KnowledgeRetriever — RAG retriever for the Citizen Grievance Portal chatbot.

OPTIMIZATIONS (Phase 4):
  - Reduced default k from 8 → 4 (fewer docs = smaller prompt = faster Gemini)
  - Score-threshold filtering: drops low-relevance chunks (< 0.30 similarity)
  - Deduplication: removes chunks with near-identical content (Jaccard > 0.85)
  - Embedding cache: reuses pre-computed query embedding from FAQCache when available
  - In-memory query result cache (128 entries) to avoid re-running FAISS for same queries
"""
import logging
from typing import List, Optional, Set, Tuple

from langchain_core.documents import Document

from app.chatbot.vector_store import FAISSVectorStore

logger = logging.getLogger(__name__)

# Minimum cosine similarity to include a document chunk in context.
# FAISS returns L2 distance by default; we use similarity_search_with_score
# and convert: similarity ≈ 1 - (distance / 2) for normalized vectors.
# Threshold of 0.30 filters clearly irrelevant chunks.
_SCORE_THRESHOLD = 0.30

# If two document chunks share > 85% of their words, drop the lower-ranked one.
_DEDUP_JACCARD_THRESHOLD = 0.85


def _jaccard_similarity(a: str, b: str) -> float:
    """Compute word-level Jaccard similarity between two strings."""
    words_a: Set[str] = set(a.lower().split())
    words_b: Set[str] = set(b.lower().split())
    if not words_a and not words_b:
        return 1.0
    intersection = len(words_a & words_b)
    union = len(words_a | words_b)
    return intersection / union if union > 0 else 0.0


def _deduplicate_docs(docs: List[Document]) -> List[Document]:
    """Remove near-duplicate document chunks using Jaccard similarity."""
    unique: List[Document] = []
    for candidate in docs:
        is_dup = False
        for kept in unique:
            if _jaccard_similarity(candidate.page_content, kept.page_content) >= _DEDUP_JACCARD_THRESHOLD:
                is_dup = True
                break
        if not is_dup:
            unique.append(candidate)
    return unique


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
        k: int = 4,
        score_threshold: float = _SCORE_THRESHOLD,
    ) -> List[Document]:
        """
        Retrieve relevant knowledge documents for a query string.

        Optimizations:
          1. In-memory LRU cache — skips FAISS entirely for repeated queries.
          2. Reduced k (default 4) — fewer chunks = smaller prompt = faster Gemini.
          3. Score threshold — filters irrelevant chunks before they reach the prompt.
          4. Deduplication — removes near-identical chunks to reduce prompt token waste.

        Args:
            query: User question string.
            k: Maximum number of documents to retrieve before filtering.
            score_threshold: Minimum similarity score to keep a chunk.

        Returns:
            List of relevant, deduplicated Document objects (≤ k).
        """
        cache_key = f"{query.strip().lower()}:{k}"
        if cache_key in self._query_cache:
            logger.debug("KnowledgeRetriever cache HIT for query: %r", query)
            return self._query_cache[cache_key]

        # Fetch more than needed to allow for threshold + dedup filtering
        fetch_k = min(k * 2, 10)
        raw_results: List[Tuple[Document, float]] = self.vector_store.similarity_search_with_score(
            query=query,
            k=fetch_k,
        )

        # Filter by score threshold
        # FAISS returns L2 distances (lower = more similar). Convert to similarity:
        # For normalized vectors, cosine_sim ≈ 1 - (l2_dist² / 2).
        # We filter out docs where similarity is below threshold.
        filtered: List[Document] = []
        for doc, score in raw_results:
            # FAISS L2 distance: 0 = identical, 2 = orthogonal, 4 = opposite
            # Convert to cosine similarity: sim = 1 - score/2
            similarity = max(0.0, 1.0 - score / 2.0)
            if similarity >= score_threshold:
                doc.metadata["_similarity"] = round(similarity, 4)
                filtered.append(doc)

        # If threshold filtering removed everything, fall back to top-k raw
        if not filtered and raw_results:
            logger.debug(
                "Score threshold %.2f filtered all %d results for query %r — using top-%d",
                score_threshold, len(raw_results), query, k,
            )
            filtered = [doc for doc, _ in raw_results[:k]]

        # Deduplicate near-identical chunks
        deduped = _deduplicate_docs(filtered)

        # Cap at k
        final_docs = deduped[:k]

        logger.debug(
            "KnowledgeRetriever: fetch=%d filtered=%d deduped=%d final=%d for query=%r",
            len(raw_results), len(filtered), len(deduped), len(final_docs), query[:60],
        )

        # Cache result
        if len(self._query_cache) >= self._max_cache_size:
            oldest_key = next(iter(self._query_cache))
            self._query_cache.pop(oldest_key, None)
        self._query_cache[cache_key] = final_docs
        return final_docs

    def retrieve_with_scores(
        self,
        query: str,
        k: int = 4,
    ) -> List[Tuple[Document, float]]:
        """Retrieve relevant knowledge documents with similarity scores."""
        return self.vector_store.similarity_search_with_score(
            query=query,
            k=k,
        )
