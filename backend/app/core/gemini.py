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

# Default model for complaint classification — fast and cost-effective
GEMINI_MODEL = "gemini-2.0-flash"
