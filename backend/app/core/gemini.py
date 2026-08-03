"""
Gemini AI client initialization.

Uses the google-genai SDK (v2+).
The client is instantiated once at module load and reused across requests.
"""
from google import genai

from app.core.config import settings


# ---------------------------------------------------------------------------
# Singleton Gemini client — thread-safe, reused for all requests
# ---------------------------------------------------------------------------

gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)

# Primary model — high throughput, fast vision and text
GEMINI_MODEL = "gemini-3.5-flash"

# Verified fallback models in priority order for resilience and sub-second latency
GEMINI_FALLBACK_MODELS: list[str] = [
    "gemini-3.1-flash-lite-preview",
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-3-flash-preview",
]

