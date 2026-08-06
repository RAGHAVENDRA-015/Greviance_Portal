"""
faq_cache.py — FAQ Semantic Cache for the Citizen Grievance Portal chatbot.

Loads a curated FAQ dataset from a JSON file, generates embeddings for all FAQ
questions at startup (once), and performs fast cosine-similarity lookups to
short-circuit Gemini calls for common questions.

Design:
- Singleton pattern — embeddings are generated exactly once, held in RAM.
- Thread-safe initialization via threading.Lock.
- Uses the same HuggingFaceEmbeddings instance already loaded by EmbeddingModel
  (zero extra memory overhead).
- Similarity threshold and data path are configurable via .env.

Performance targets:
- FAQ hit latency: < 20ms (in-memory cosine similarity over numpy arrays).
- FAQ miss latency: < 2ms (no additional I/O).
"""
from __future__ import annotations

import json
import logging
import threading
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np

from app.chatbot.embeddings import EmbeddingModel
from app.chatbot.utils.normalize import normalize_question

logger = logging.getLogger(__name__)


@dataclass
class FAQEntry:
    """Represents a single FAQ entry with its pre-computed embedding."""

    question: str
    answer: str
    normalized: str
    embedding: np.ndarray = field(repr=False)


class FAQCache:
    """
    In-memory FAQ semantic cache backed by cosine-similarity lookup.

    Lifecycle:
        cache = FAQCache()
        cache.load(path_to_faqs_json, threshold=0.90)

        result = cache.search("how do i submit a grievance?")
        if result["found"]:
            return result["answer"]

    Thread safety:
        load() acquires _load_lock. search() is read-only after loading.
    """

    _instance: Optional[FAQCache] = None
    _instance_lock: threading.Lock = threading.Lock()

    def __init__(self) -> None:
        self._entries: List[FAQEntry] = []
        self._embeddings_matrix: Optional[np.ndarray] = None  # shape: (N, D)
        self._threshold: float = 0.90
        self._loaded: bool = False
        self._load_lock: threading.Lock = threading.Lock()

    # ------------------------------------------------------------------
    # Singleton accessor
    # ------------------------------------------------------------------

    @classmethod
    def get_instance(cls) -> "FAQCache":
        """Return the singleton FAQCache instance (creates it if needed)."""
        if cls._instance is None:
            with cls._instance_lock:
                if cls._instance is None:
                    cls._instance = cls()
        return cls._instance

    # ------------------------------------------------------------------
    # Loading
    # ------------------------------------------------------------------

    def load(self, faqs_path: Path, threshold: float = 0.90) -> None:
        """
        Load FAQs from a JSON file and pre-compute embeddings for all questions.

        This is designed to be called once at application startup. Subsequent
        calls are no-ops (idempotent — guarded by _loaded flag).

        Args:
            faqs_path: Absolute path to the faqs.json file.
            threshold:  Minimum cosine similarity to consider a FAQ a cache hit.
                        Defaults to 0.90 (from config).

        Raises:
            FileNotFoundError: If faqs_path does not exist.
            json.JSONDecodeError: If the file is not valid JSON.
        """
        with self._load_lock:
            if self._loaded:
                logger.debug("FAQCache already loaded — skipping.")
                return

            self._threshold = threshold
            t0 = time.perf_counter()

            if not faqs_path.exists():
                logger.warning("FAQCache: faqs.json not found at %s — FAQ cache disabled.", faqs_path)
                self._loaded = True
                return

            with faqs_path.open("r", encoding="utf-8") as fh:
                raw: List[Dict[str, str]] = json.load(fh)

            if not raw:
                logger.warning("FAQCache: faqs.json is empty — FAQ cache disabled.")
                self._loaded = True
                return

            questions = [item["question"] for item in raw]
            normalized_questions = [normalize_question(q) for q in questions]

            # Generate all embeddings in a single batch call (much faster than one-by-one)
            embedding_model = EmbeddingModel.get_embeddings()
            raw_embeddings: List[List[float]] = embedding_model.embed_documents(normalized_questions)

            entries: List[FAQEntry] = []
            matrix_rows: List[np.ndarray] = []

            for item, norm_q, emb in zip(raw, normalized_questions, raw_embeddings):
                vec = np.array(emb, dtype=np.float32)
                norm = np.linalg.norm(vec)
                if norm > 0:
                    vec = vec / norm  # L2-normalise for cosine via dot product
                entries.append(FAQEntry(
                    question=item["question"],
                    answer=item["answer"],
                    normalized=norm_q,
                    embedding=vec,
                ))
                matrix_rows.append(vec)

            self._entries = entries
            self._embeddings_matrix = np.stack(matrix_rows, axis=0)  # (N, D)
            self._loaded = True

            elapsed_ms = (time.perf_counter() - t0) * 1000
            logger.info(
                "FAQCache loaded %d entries in %.1f ms (threshold=%.2f)",
                len(entries),
                elapsed_ms,
                threshold,
            )

    # ------------------------------------------------------------------
    # Search
    # ------------------------------------------------------------------

    def search(self, question: str, return_embedding: bool = False) -> Dict[str, Any]:
        """
        Search the FAQ cache for a semantically similar question.

        OPTIMIZATION: Now supports returning the computed embedding to avoid re-computation
        in downstream semantic caching.

        Steps:
            1. Normalize the incoming question.
            2. Check embedding cache first (new LRU cache for query embeddings).
            3. Embed it using the shared HuggingFace model (only if cache miss).
            4. Compute cosine similarity against all FAQ embeddings (matrix dot product).
            5. Return the best match if its score ≥ threshold.

        Args:
            question: Raw user question string.
            return_embedding: If True, includes the computed embedding in response.

        Returns:
            On hit:  {"found": True,  "answer": str, "source": "FAQ", "score": float,
                      "matched_question": str, "latency_ms": float, "embedding": Optional[np.ndarray]}
            On miss: {"found": False, "latency_ms": float, "embedding": Optional[np.ndarray]}
        """
        t0 = time.perf_counter()

        if not self._loaded or self._embeddings_matrix is None or len(self._entries) == 0:
            latency = (time.perf_counter() - t0) * 1000
            return {"found": False, "latency_ms": round(latency, 2)}

        normalized = normalize_question(question)
        if not normalized:
            latency = (time.perf_counter() - t0) * 1000
            return {"found": False, "latency_ms": round(latency, 2)}

        # Check embedding cache first (NEW OPTIMIZATION)
        cache_key = f"embed:{normalized}"
        if hasattr(self, '_embedding_cache') and cache_key in self._embedding_cache:
            query_vec = self._embedding_cache[cache_key]
            t_embed = 0.0
        else:
            try:
                t_embed_start = time.perf_counter()
                embedding_model = EmbeddingModel.get_embeddings()
                raw_vec: List[float] = embedding_model.embed_query(normalized)
                query_vec = np.array(raw_vec, dtype=np.float32)
                norm = np.linalg.norm(query_vec)
                if norm > 0:
                    query_vec = query_vec / norm
                t_embed = (time.perf_counter() - t_embed_start) * 1000
                
                # Store in embedding cache (LRU, max 256 entries)
                if not hasattr(self, '_embedding_cache'):
                    from collections import OrderedDict
                    self._embedding_cache: OrderedDict[str, np.ndarray] = OrderedDict()
                self._embedding_cache[cache_key] = query_vec
                if len(self._embedding_cache) > 256:
                    self._embedding_cache.popitem(last=False)
                    
            except Exception as exc:
                latency = (time.perf_counter() - t0) * 1000
                logger.warning("FAQCache.search embedding error: %s — treated as MISS", exc)
                return {"found": False, "latency_ms": round(latency, 2)}

        try:
            # Cosine similarity = dot product of L2-normalised vectors
            scores: np.ndarray = self._embeddings_matrix @ query_vec  # shape (N,)
            best_idx: int = int(np.argmax(scores))
            best_score: float = float(scores[best_idx])

            latency = (time.perf_counter() - t0) * 1000

            result: Dict[str, Any] = {
                "found": best_score >= self._threshold,
                "latency_ms": round(latency, 2),
            }
            
            if return_embedding:
                result["embedding"] = query_vec
                result["embed_time_ms"] = round(t_embed, 2)

            if best_score >= self._threshold:
                entry = self._entries[best_idx]
                result.update({
                    "answer": entry.answer,
                    "source": "FAQ",
                    "score": round(best_score, 4),
                    "matched_question": entry.question,
                })
                logger.info(
                    "FAQ Cache HIT — score=%.4f embed=%.1fms total=%.1f ms",
                    best_score,
                    t_embed,
                    latency,
                )
            else:
                logger.debug(
                    "FAQ Cache MISS — best_score=%.4f (threshold=%.2f) embed=%.1fms total=%.1f ms",
                    best_score,
                    self._threshold,
                    t_embed,
                    latency,
                )
                
            return result

        except Exception as exc:
            latency = (time.perf_counter() - t0) * 1000
            logger.warning("FAQCache.search error: %s — treated as MISS", exc)
            result = {"found": False, "latency_ms": round(latency, 2)}
            if return_embedding:
                result["embedding"] = query_vec
            return result

    # ------------------------------------------------------------------
    # Diagnostics
    # ------------------------------------------------------------------

    @property
    def size(self) -> int:
        """Number of FAQ entries loaded."""
        return len(self._entries)

    @property
    def is_loaded(self) -> bool:
        """True if load() has been called and completed."""
        return self._loaded
