"""
AIService — Gemini-powered complaint intelligence.

Responsibilities:
    - Classify a complaint into a category, priority, and department.
    - Generate a concise AI summary.
    - Return a confidence score.

Design:
    - AI calls are async.
    - Hard timeout (15s) prevents event loop starvation on slow API calls.
    - Classification failures never crash complaint creation — they log
      and return None so the complaint is still saved without AI metadata.
    - Prompt lives in app/prompts/complaint_prompt.py — not here.
    - 3-model fallback chain handles free-tier quota exhaustion gracefully.
"""
import asyncio
import json
import logging
from dataclasses import dataclass
from typing import Optional

from google.genai import types
from pydantic import BaseModel

from app.core.gemini import gemini_client, GEMINI_MODEL
from app.prompts.complaint_prompt import COMPLAINT_CLASSIFICATION_PROMPT

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Model fallback chain — tried in order on 429 quota exhaustion
# ---------------------------------------------------------------------------

_DEFAULT_MODELS: list[str] = [
    GEMINI_MODEL,            # gemini-2.0-flash (primary)
    "gemini-1.5-flash",     # fallback on quota exhaustion
    "gemini-1.5-flash-8b",  # last resort — most permissive free quota
]

# ---------------------------------------------------------------------------
# Input safety limits — prevent token abuse and prompt injection
# ---------------------------------------------------------------------------

_MAX_TITLE_LENGTH = 200
_MAX_DESCRIPTION_LENGTH = 2000

# ---------------------------------------------------------------------------
# Valid values for server-side validation after parsing Gemini response
# ---------------------------------------------------------------------------

_VALID_CATEGORIES = {
    "Water Supply", "Roads", "Electricity", "Garbage",
    "Drainage", "Public Safety", "Health", "Corruption", "Other",
}
_VALID_PRIORITIES = {"Low", "Medium", "High"}

# ---------------------------------------------------------------------------
# Result type
# ---------------------------------------------------------------------------

class ClassificationSchema(BaseModel):
    category: str
    priority: str
    department: str
    summary: str
    confidence: float

@dataclass
class ClassificationResult:
    """
    Typed, serializable container for Gemini classification output.
    """
    category: str
    priority: str
    department: str
    summary: str
    confidence: float

    def __post_init__(self) -> None:
        self.confidence = round(min(max(self.confidence, 0.0), 1.0), 4)


# ---------------------------------------------------------------------------
# AIService
# ---------------------------------------------------------------------------

class AIService:

    @staticmethod
    def _build_prompt(title: str, description: str) -> str:
        safe_title = title.strip()[:_MAX_TITLE_LENGTH]
        safe_description = description.strip()[:_MAX_DESCRIPTION_LENGTH]
        complaint_text = f"Title: {safe_title}\n\nDescription: {safe_description}"
        return COMPLAINT_CLASSIFICATION_PROMPT + complaint_text

    @staticmethod
    def _parse_response(raw_text: str) -> Optional[ClassificationResult]:
        text = raw_text.strip()

        if text.startswith("```"):
            lines = text.splitlines()
            text = "\n".join(lines[1:-1]).strip()

        try:
            data = json.loads(text)
        except json.JSONDecodeError as exc:
            logger.warning("Gemini returned non-JSON response: %.200s | Error: %s", raw_text, exc)
            return None

        required = {"category", "priority", "department", "summary", "confidence"}
        missing = required - data.keys()
        if missing:
            logger.warning("Gemini response missing fields: %s", missing)
            return None

        category = str(data["category"]).strip()
        priority = str(data["priority"]).strip()

        if category not in _VALID_CATEGORIES:
            logger.warning("Gemini returned unknown category %r — defaulting to 'Other'", category)
            category = "Other"

        if priority not in _VALID_PRIORITIES:
            logger.warning("Gemini returned unknown priority %r — defaulting to 'Medium'", priority)
            priority = "Medium"

        department = str(data["department"]).strip() or "Unassigned"
        summary = str(data["summary"]).strip() or "No summary available."

        try:
            confidence = float(data["confidence"])
        except (TypeError, ValueError):
            confidence = 0.5

        return ClassificationResult(
            category=category,
            priority=priority,
            department=department,
            summary=summary,
            confidence=confidence,
        )

    @staticmethod
    async def classify_complaint(
        title: str,
        description: str,
        models: list[str] = _DEFAULT_MODELS,
    ) -> Optional[ClassificationResult]:
        """
        Send the complaint to Gemini for classification using Structured Outputs.
        """
        prompt = AIService._build_prompt(title, description)

        for model in models:
            try:
                # Async call using native SDK
                response = await asyncio.wait_for(
                    gemini_client.aio.models.generate_content(
                        model=model,
                        contents=prompt,
                        config=types.GenerateContentConfig(
                            response_mime_type="application/json",
                            response_schema=ClassificationSchema,
                        )
                    ),
                    timeout=15.0,
                )

                raw_text = response.text
                if not raw_text:
                    logger.warning("Gemini (%s) returned empty response for %r", model, title)
                    return None

                result = AIService._parse_response(raw_text)

                if result:
                    logger.info(
                        "Classified via %s: category=%r priority=%r confidence=%.2f",
                        model, result.category, result.priority, result.confidence,
                    )

                return result

            except asyncio.TimeoutError:
                logger.warning("Gemini (%s) timed out after 15s for %r — trying next model.", model, title)
                continue
            except Exception as exc:
                error_str = str(exc)
                if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
                    logger.warning("Quota exhausted on %s for %r — trying next model.", model, title)
                    continue
                logger.error("Gemini (%s) classification failed for %r: %s", model, title, exc)
                return None

        logger.error("All Gemini models exhausted for %r — saving without AI metadata.", title)
        return None

