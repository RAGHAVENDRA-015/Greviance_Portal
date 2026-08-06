import unittest
from app.chatbot.utils.normalize import normalize_question, cached_normalize


class TestNormalizeQuestion(unittest.TestCase):
    def test_basic_lowercase(self):
        self.assertEqual(normalize_question("HOW DO I FILE A COMPLAINT"), "how do i file a complaint")

    def test_strips_whitespace(self):
        self.assertEqual(normalize_question("  hello world  "), "hello world")

    def test_strips_punctuation(self):
        self.assertEqual(normalize_question("What is Next.js???"), "what is next js")


    def test_collapses_internal_spaces(self):
        self.assertEqual(normalize_question("hello   world"), "hello world")

    def test_empty_string(self):
        self.assertEqual(normalize_question(""), "")

    def test_whitespace_only(self):
        self.assertEqual(normalize_question("   "), "")

    def test_unicode_normalization(self):
        self.assertEqual(normalize_question("caf\u00e9"), "caf\u00e9")

    def test_trailing_question_marks(self):
        self.assertEqual(normalize_question("how do i track???"), "how do i track")

    def test_apostrophe_preserved(self):
        result = normalize_question("what's the status")
        self.assertIn("what", result)
        self.assertIn("status", result)

    def test_idempotent(self):
        q = "How do I file a complaint?"
        self.assertEqual(normalize_question(normalize_question(q)), normalize_question(q))

    def test_deterministic(self):
        q = "  TRACK my complaint!  "
        self.assertEqual(normalize_question(q), normalize_question(q))


class TestCachedNormalize(unittest.TestCase):
    def test_same_result_as_normalize(self):
        q = "How do I submit a grievance?"
        self.assertEqual(cached_normalize(q), normalize_question(q))

    def test_cached_call_consistent(self):
        q = "HELLO WORLD"
        r1 = cached_normalize(q)
        r2 = cached_normalize(q)
        self.assertEqual(r1, r2)


if __name__ == "__main__":
    unittest.main()
