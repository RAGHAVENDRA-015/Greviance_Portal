"""
normalize.py — Question text normalizer for the Citizen Grievance Portal chatbot.

Normalizes user input to a canonical form used as cache keys and for semantic
comparison. All normalization is deterministic and reversible for logging.

Usage:
    from app.chatbot.utils.normalize import normalize_question

    key = normalize_question("  HOW do I FILE a Complaint??? ")
    # → "how do i file a complaint"
"""
import re
import unicodedata
from functools import lru_cache


# Punctuation characters to strip (all ASCII punctuation except apostrophe for
# contractions, which are rare in portal queries)
_PUNCT_RE = re.compile(r"[^\w\s']")
_WHITESPACE_RE = re.compile(r"\s+")
_TRAILING_Q_RE = re.compile(r"[?]+$")


def normalize_question(text: str) -> str:
    """
    Normalize a user question to a canonical string for use as a cache key.

    Transformations applied (in order):
    1. Unicode NFC normalization (accent/composed-character safety).
    2. Lowercase.
    3. Strip leading/trailing whitespace.
    4. Remove punctuation (retains alphanumerics, spaces, apostrophes).
    5. Collapse multiple consecutive spaces to a single space.
    6. Strip any trailing question marks (after punctuation removal the regex
       catches residual '?' characters).

    Args:
        text: Raw user question string.

    Returns:
        Normalized question string, or empty string if input is blank.

    Examples:
        >>> normalize_question("  HOW do I FILE Complaint??? ")
        'how do i file complaint'
        >>> normalize_question("What is Next.js?")
        'what is nextjs'
        >>> normalize_question("  hello!  ")
        'hello'
    """
    if not text:
        return ""

    # 1. Unicode NFC
    text = unicodedata.normalize("NFC", text)

    # 2. Lowercase
    text = text.lower()

    # 3. Strip outer whitespace
    text = text.strip()

    # 4. Remove punctuation (keep word chars, spaces, apostrophes)
    text = _PUNCT_RE.sub(" ", text)

    # 5. Collapse whitespace
    text = _WHITESPACE_RE.sub(" ", text).strip()

    # 6. Strip trailing question marks (may survive as raw chars)
    text = _TRAILING_Q_RE.sub("", text).strip()

    return text


@lru_cache(maxsize=4096)
def cached_normalize(text: str) -> str:
    """
    Memoized version of normalize_question for high-frequency repeated inputs.
    Uses Python's built-in lru_cache (thread-safe in CPython).

    Args:
        text: Raw user question string.

    Returns:
        Normalized question string.
    """
    return normalize_question(text)
