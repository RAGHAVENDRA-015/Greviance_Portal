import time
import unittest
import threading
from app.chatbot.response_cache import ResponseCache


def _fresh_cache(max_size: int = 5, ttl: float = 86400.0) -> ResponseCache:
    return ResponseCache(max_size=max_size, ttl_seconds=ttl)


def _make_result(answer: str = "Answer text", intent: str = "knowledge") -> dict:
    return {"answer": answer, "sources": ["FAQ"], "intent": intent}


class TestResponseCacheGet(unittest.TestCase):
    def test_miss_on_empty_cache(self):
        cache = _fresh_cache()
        self.assertIsNone(cache.get("nonexistent"))

    def test_hit_after_put(self):
        cache = _fresh_cache()
        cache.put("how to file complaint", _make_result("File via dashboard"))
        result = cache.get("how to file complaint")
        self.assertIsNotNone(result)
        self.assertEqual(result["answer"], "File via dashboard")

    def test_miss_after_ttl_expires(self):
        cache = _fresh_cache(ttl=0.05)
        cache.put("track complaint", _make_result("Check your dashboard"))
        time.sleep(0.1)
        self.assertIsNone(cache.get("track complaint"))

    def test_sources_preserved(self):
        cache = _fresh_cache()
        cache.put("query", {"answer": "X", "sources": ["Source A", "Source B"], "intent": "knowledge"})
        result = cache.get("query")
        self.assertEqual(result["sources"], ["Source A", "Source B"])

    def test_intent_preserved(self):
        cache = _fresh_cache()
        cache.put("key", _make_result(intent="greeting"))
        self.assertEqual(cache.get("key")["intent"], "greeting")


class TestResponseCacheLRUEviction(unittest.TestCase):
    def test_lru_eviction_when_full(self):
        cache = _fresh_cache(max_size=3)
        cache.put("k1", _make_result("A1"))
        cache.put("k2", _make_result("A2"))
        cache.put("k3", _make_result("A3"))
        cache.get("k1")
        cache.put("k4", _make_result("A4"))
        self.assertIsNotNone(cache.get("k1"))
        self.assertIsNone(cache.get("k2"))


class TestResponseCacheInvalidate(unittest.TestCase):
    def test_invalidate_existing_key(self):
        cache = _fresh_cache()
        cache.put("q", _make_result("X"))
        self.assertTrue(cache.invalidate("q"))
        self.assertIsNone(cache.get("q"))

    def test_invalidate_nonexistent_key(self):
        cache = _fresh_cache()
        self.assertFalse(cache.invalidate("nope"))


class TestResponseCacheClear(unittest.TestCase):
    def test_clear_removes_all_entries(self):
        cache = _fresh_cache()
        for i in range(5):
            cache.put(f"key{i}", _make_result(f"Answer{i}"))
        self.assertEqual(cache.size, 5)
        cache.clear()
        self.assertEqual(cache.size, 0)


class TestResponseCacheStats(unittest.TestCase):
    def test_stats_structure(self):
        cache = _fresh_cache()
        stats = cache.stats
        self.assertIn("hits", stats)
        self.assertIn("misses", stats)
        self.assertIn("evictions", stats)
        self.assertIn("hit_rate_pct", stats)
        self.assertIn("size", stats)

    def test_hit_count_increments(self):
        cache = _fresh_cache()
        cache.put("q", _make_result("A"))
        cache.get("q")
        cache.get("q")
        self.assertEqual(cache.stats["hits"], 2)

    def test_miss_count_increments(self):
        cache = _fresh_cache()
        cache.get("nonexistent")
        self.assertEqual(cache.stats["misses"], 1)

    def test_hit_rate_calculation(self):
        cache = _fresh_cache()
        cache.put("q", _make_result("A"))
        cache.get("q")
        cache.get("missing")
        stats = cache.stats
        self.assertEqual(stats["hit_rate_pct"], 50.0)


class TestResponseCacheThreadSafety(unittest.TestCase):
    def test_concurrent_puts(self):
        cache = _fresh_cache(max_size=200)
        errors = []

        def worker(i: int):
            try:
                cache.put(f"key{i}", _make_result(f"answer{i}"))
                cache.get(f"key{i}")
            except Exception as e:
                errors.append(e)

        threads = [threading.Thread(target=worker, args=(i,)) for i in range(50)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        self.assertEqual(errors, [])


if __name__ == "__main__":
    unittest.main()
