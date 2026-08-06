"""
response_cache.py — LRU Response Cache with TTL for the chatbot.

Stores full Gemini answers keyed by normalized question text.
Prevents repeat Gemini API calls for identical queries within the TTL window.

Design:
- OrderedDict-backed LRU eviction (O(1) move-to-end).
- Per-entry timestamp for TTL checking.
- Thread-safe via a single RLock (reentrant for internal helper calls).
- Configurable max_size and ttl_seconds via .env / config.

Performance targets:
- Cache hit retrieval: < 1ms (pure in-memory dict lookup).
- Cache write: < 1ms.
"""
from __future__ import annotations

import logging
import threading
import time
from collections import OrderedDict
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


@dataclass
class _CacheEntry:
    """Internal representation of a cached chatbot response."""

    answer: str
    sources: List[str]
    intent: str
    timestamp: float = field(default_factory=time.monotonic)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "answer": self.answer,
            "sources": self.sources,
            "intent": self.intent,
            "timestamp": self.timestamp,
        }

    @classmethod
    def from_result(cls, result: Dict[str, Any]) -> "_CacheEntry":
        return cls(
            answer=result.get("answer", ""),
            sources=result.get("sources", []),
            intent=result.get("intent", ""),
        )


class ResponseCache:
    """
    Thread-safe LRU cache with TTL for chatbot responses.

    Key:   normalized question string (from normalize_question()).
    Value: {"answer": str, "sources": [...], "intent": str, "timestamp": float}

    Eviction policy (in priority order):
        1. TTL expiry — expired entries are removed on access.
        2. LRU eviction — when max_size is reached, oldest entry is removed.

    Usage:
        cache = ResponseCache.get_instance()
        cached = cache.get("how do i file a complaint")
        if cached:
            return cached
        result = await call_gemini(...)
        cache.put("how do i file a complaint", result)
    """

    _instance: Optional["ResponseCache"] = None
    _instance_lock: threading.Lock = threading.Lock()

    def __init__(self, max_size: int = 500, ttl_seconds: float = 86400.0) -> None:
        """
        Args:
            max_size:    Maximum number of entries before LRU eviction. Default 500.
            ttl_seconds: Time-to-live per entry in seconds. Default 86400 (24 hours).
        """
        self._max_size = max_size
        self._ttl = ttl_seconds
        self._store: OrderedDict[str, _CacheEntry] = OrderedDict()
        self._lock = threading.RLock()

        # Metrics counters
        self._hits: int = 0
        self._misses: int = 0
        self._evictions: int = 0

    # ------------------------------------------------------------------
    # Singleton accessor
    # ------------------------------------------------------------------

    @classmethod
    def get_instance(cls, max_size: int = 500, ttl_seconds: float = 86400.0) -> "ResponseCache":
        """Return the singleton ResponseCache instance."""
        if cls._instance is None:
            with cls._instance_lock:
                if cls._instance is None:
                    cls._instance = cls(max_size=max_size, ttl_seconds=ttl_seconds)
                    logger.info(
                        "ResponseCache initialized — max_size=%d ttl=%.0fs",
                        max_size,
                        ttl_seconds,
                    )
        return cls._instance

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def get(self, key: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve a cached response.

        Moves the accessed entry to the end (most-recently-used) if not expired.
        Removes the entry and returns None if TTL has elapsed.

        Args:
            key: Normalized question string.

        Returns:
            Cached result dict on hit, None on miss or TTL expiry.
        """
        t0 = time.perf_counter()
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                self._misses += 1
                latency = (time.perf_counter() - t0) * 1000
                logger.info("Response Cache MISS — key=%r latency=%.2f ms", key[:60], latency)
                return None

            # TTL check
            age = time.monotonic() - entry.timestamp
            if age > self._ttl:
                del self._store[key]
                self._misses += 1
                latency = (time.perf_counter() - t0) * 1000
                logger.info(
                    "Response Cache EXPIRED (age=%.0fs) — key=%r latency=%.2f ms",
                    age,
                    key[:60],
                    latency,
                )
                return None

            # Move to end (mark as recently used)
            self._store.move_to_end(key)
            self._hits += 1
            latency = (time.perf_counter() - t0) * 1000
            logger.info("Response Cache HIT — key=%r latency=%.2f ms", key[:60], latency)
            return entry.to_dict()

    def put(self, key: str, result: Dict[str, Any]) -> None:
        """
        Store a chatbot response in the cache.

        Evicts the least-recently-used entry if the cache is at capacity.

        Args:
            key:    Normalized question string.
            result: Dict with at minimum 'answer', 'sources', and 'intent' keys.
        """
        with self._lock:
            if key in self._store:
                self._store.move_to_end(key)
                self._store[key] = _CacheEntry.from_result(result)
                return

            # LRU eviction
            if len(self._store) >= self._max_size:
                evicted_key, _ = self._store.popitem(last=False)
                self._evictions += 1
                logger.debug("Response Cache LRU evict — key=%r", evicted_key[:60])

            self._store[key] = _CacheEntry.from_result(result)
            logger.info("Response Cache STORED — key=%r (size=%d)", key[:60], len(self._store))

    def invalidate(self, key: str) -> bool:
        """
        Remove a specific key from the cache.

        Args:
            key: Normalized question string.

        Returns:
            True if the key existed and was removed, False otherwise.
        """
        with self._lock:
            if key in self._store:
                del self._store[key]
                logger.debug("Response Cache INVALIDATED — key=%r", key[:60])
                return True
            return False

    def clear(self) -> None:
        """Remove all entries from the cache (useful for testing)."""
        with self._lock:
            count = len(self._store)
            self._store.clear()
            logger.info("Response Cache CLEARED — %d entries removed.", count)

    # ------------------------------------------------------------------
    # Diagnostics
    # ------------------------------------------------------------------

    @property
    def size(self) -> int:
        """Current number of entries in the cache."""
        with self._lock:
            return len(self._store)

    @property
    def stats(self) -> Dict[str, Any]:
        """Return cache hit/miss/eviction statistics."""
        with self._lock:
            total = self._hits + self._misses
            hit_rate = (self._hits / total * 100) if total > 0 else 0.0
            return {
                "size": len(self._store),
                "max_size": self._max_size,
                "ttl_seconds": self._ttl,
                "hits": self._hits,
                "misses": self._misses,
                "evictions": self._evictions,
                "hit_rate_pct": round(hit_rate, 1),
            }
