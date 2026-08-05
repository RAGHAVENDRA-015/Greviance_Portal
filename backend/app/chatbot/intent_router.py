"""
IntentRouter — Classifies user query intent for the hybrid AI chatbot.

Supported intents:
- KNOWLEDGE: Portal documentation, FAQs, procedures, general info (handled by RAG + FAISS).
- COMPLAINT_STATUS: Inquiry about the status/progress of specific or latest complaint.
- MY_COMPLAINTS: Inquiry listing or summarizing user's submitted complaints.
- GREETING: Conversational greetings (hello, hi, etc.).
- UNKNOWN: Unclear or unhandled queries (defaults to KNOWLEDGE / RAG fallback).

Design:
Extracted into a standalone class with a clean interface (`detect`). Uses rule-based regex
initially, allowing seamless future replacement with an LLM-based intent classifier.
"""
from enum import Enum
import logging
import re

logger = logging.getLogger(__name__)


class Intent(str, Enum):
    KNOWLEDGE = "knowledge"
    COMPLAINT_STATUS = "complaint_status"
    MY_COMPLAINTS = "my_complaints"
    GREETING = "greeting"
    UNKNOWN = "unknown"


class IntentRouter:
    """
    Detects user intent using pattern matching and keyword detection.
    Encapsulates routing rules so it can easily be swapped with an AI/LLM classifier.
    """

    def __init__(self) -> None:
        self._greeting_pattern = re.compile(
            r"^(h+i+|h+e+y+|h+e+l+o+|greetings|good\s*(morning|evening|afternoon)|howdy|hola|yo)(\s+.*)?$",
            re.IGNORECASE,
        )
        self._my_complaints_pattern = re.compile(
            r"\b(my complaints|my grievances|complaints filed|list my|all my complaints|my posts|show my complaints)\b",
            re.IGNORECASE,
        )
        self._status_pattern = re.compile(
            r"\b(status|track|progress|check complaint|where is my complaint|complaint status|latest complaint|update on my)\b",
            re.IGNORECASE,
        )
        self._knowledge_pattern = re.compile(
            r"\b(how to|what is|where|procedure|portal|contact|help|guideline|rule|policy|file a|submit a|department)\b",
            re.IGNORECASE,
        )

    def detect(self, question: str) -> Intent:
        """
        Classifies a user's question into one of the supported Intent enums.
        """
        if not question or not question.strip():
            return Intent.UNKNOWN

        text = question.strip().lower()

        # 1. Greetings
        if self._greeting_pattern.search(text) and len(text.split()) <= 4:
            logger.info("Detected intent: GREETING for query: %r", question)
            return Intent.GREETING

        # 2. Specific intent: My Complaints listing
        if self._my_complaints_pattern.search(text):
            logger.info("Detected intent: MY_COMPLAINTS for query: %r", question)
            return Intent.MY_COMPLAINTS

        # 3. Specific intent: Complaint Status check
        if self._status_pattern.search(text):
            logger.info("Detected intent: COMPLAINT_STATUS for query: %r", question)
            return Intent.COMPLAINT_STATUS

        # 4. Explicit Knowledge base query
        if self._knowledge_pattern.search(text):
            logger.info("Detected intent: KNOWLEDGE for query: %r", question)
            return Intent.KNOWLEDGE

        # Default fallback to RAG Knowledge Base
        logger.info("Defaulting intent: KNOWLEDGE for query: %r", question)
        return Intent.KNOWLEDGE