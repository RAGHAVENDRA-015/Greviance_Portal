"""
ChatbotService — Orchestrates hybrid intent routing, RAG search, user complaint data retrieval, and conversation memory.
Supports both synchronous chat, real-time streaming, and SSE streaming responses with metadata.

Performance architecture (multi-level cache):
  Layer 1 — Greeting Detection:    < 5 ms  (static response, no Gemini)
  Layer 2 — FAQ Semantic Cache:    < 20 ms (cosine-similarity, no Gemini)
  Layer 3 — Response LRU Cache:    < 50 ms (dict lookup, no Gemini)
  Layer 4 — Complaint Operations:  < 100 ms (MongoDB only, no Gemini for status/list)
  Layer 5 — Gemini (new queries):  1–3 s   (fallback chain, cached after first call)
"""
import asyncio
import json
import logging
import threading
import time
from typing import Any, AsyncGenerator, Dict, List, Optional

from google.genai import types

from app.chatbot.faq_cache import FAQCache
from app.chatbot.intent_router import Intent, IntentRouter
from app.chatbot.memory import MemoryService
from app.chatbot.prompt import PERSONAL_DATA_PROMPT, SYSTEM_PROMPT
from app.chatbot.response_cache import ResponseCache
from app.chatbot.retriever import KnowledgeRetriever
from app.chatbot.tools.complaint_tool import ComplaintTool
from app.chatbot.utils.normalize import normalize_question
from app.core.config import settings
from app.core.gemini import (
    GEMINI_FALLBACK_MODELS,
    GEMINI_MODEL,
    gemini_client,
)
from app.models.user import User

logger = logging.getLogger(__name__)

# ── Static greeting responses (sub-5 ms, zero Gemini calls) ──────────────────
_GREETING_RESPONSE = (
    "Hello! I am your **Citizen Grievance Portal AI Assistant**. "
    "I can help you with:\n"
    "- Filing and tracking complaints\n"
    "- Understanding portal procedures\n"
    "- Checking department responsibilities\n\n"
    "How can I assist you today?"
)

_GREETING_KEYWORDS = frozenset({
    "hi", "hello", "hey", "good morning", "good afternoon",
    "good evening", "howdy", "hola", "yo",
})


def _is_pure_greeting(text: str) -> bool:
    """Return True if text is a short greeting with no additional content."""
    stripped = text.strip().lower()
    if stripped in _GREETING_KEYWORDS:
        return True
    # Allow "hi there", "hello!", "hey chatbot" etc. (≤ 3 words)
    if len(stripped.split()) <= 3:
        for kw in _GREETING_KEYWORDS:
            if stripped.startswith(kw):
                return True
    return False


class ChatbotService:
    """
    Core Chatbot orchestrator service supporting both standard and streaming chat responses.

    Cache layers checked in order:
        1. Intent Router (GREETING → instant static response)
        2. FAQ Semantic Cache (cosine similarity ≥ threshold)
        3. Response LRU Cache (exact normalized key, TTL 24h)
        4. FAISS + Gemini (new queries — result stored in Response Cache)

    Heavy components (retriever, vector store) are lazily initialized on demand.
    FAQ cache and Response cache are singletons loaded at startup.
    """

    def __init__(
        self,
        retriever: Optional[KnowledgeRetriever] = None,
        router: Optional[IntentRouter] = None,
        complaint_tool: Optional[ComplaintTool] = None,
        memory_service: Optional[MemoryService] = None,
        faq_cache: Optional[FAQCache] = None,
        response_cache: Optional[ResponseCache] = None,
    ) -> None:
        self._retriever = retriever
        self.router = router or IntentRouter()
        self.complaint_tool = complaint_tool or ComplaintTool()
        self.memory_service = memory_service or MemoryService()
        self.faq_cache = faq_cache or FAQCache.get_instance()
        self.response_cache = response_cache or ResponseCache.get_instance(
            max_size=settings.CACHE_MAX_SIZE,
            ttl_seconds=settings.CACHE_TTL_SECONDS,
        )

    @property
    def retriever(self) -> KnowledgeRetriever:
        """Lazily initialize KnowledgeRetriever only when knowledge search is called."""
        if self._retriever is None:
            self._retriever = KnowledgeRetriever()
        return self._retriever

    # ──────────────────────────────────────────────────────────────────────────
    # Standard chat (non-streaming)
    # ──────────────────────────────────────────────────────────────────────────

    async def chat(self, question: str, user: Optional[User] = None) -> Dict[str, Any]:
        """
        Main entry point for standard (non-streaming) user queries.
        Returns a dictionary containing 'answer', 'sources', 'intent', and 'conversation_id'.
        When DEBUG=True the response also includes a 'metrics' key with per-stage latency.
        """
        t_total = time.perf_counter()
        user_id = str(user.id) if user and hasattr(user, "id") and user.id else None
        metrics: Dict[str, Any] = {}

        # ── 1. Intent detection ────────────────────────────────────────
        t0 = time.perf_counter()
        intent = self.router.detect(question)
        metrics["intent_router_ms"] = round((time.perf_counter() - t0) * 1000, 2)
        logger.info(
            "Intent=%s user_id=%s query=%r intent_router=%.2f ms",
            intent.value,
            user_id,
            question[:80],
            metrics["intent_router_ms"],
        )

        # ── 2. GREETING: instant static response ───────────────────────
        if intent == Intent.GREETING or _is_pure_greeting(question):
            metrics["faq_hit"] = False
            metrics["cache_hit"] = False
            metrics["gemini_called"] = False
            metrics["total_ms"] = round((time.perf_counter() - t_total) * 1000, 2)
            logger.info("Intent=GREETING — returning static response in %.2f ms", metrics["total_ms"])
            result = {
                "answer": _GREETING_RESPONSE,
                "sources": [],
                "intent": Intent.GREETING.value,
                "conversation_id": user_id or "anonymous",
            }
            if settings.DEBUG:
                result["metrics"] = metrics
            await self._save_memory(user_id, question, result["answer"])
            return result

        # ── 3. COMPLAINT_STATUS / MY_COMPLAINTS: MongoDB only ─────────
        if intent == Intent.COMPLAINT_STATUS:
            result = await self.answer_complaint_status(question, user, user_id)
            metrics["faq_hit"] = False
            metrics["cache_hit"] = False
            metrics["gemini_called"] = False
            metrics["total_ms"] = round((time.perf_counter() - t_total) * 1000, 2)
            if settings.DEBUG:
                result["metrics"] = metrics
            await self._save_memory(user_id, question, result.get("answer", ""))
            return result

        if intent == Intent.MY_COMPLAINTS:
            if user_id:
                history_str = await self.memory_service.format_history_for_prompt(user_id=user_id)
            else:
                history_str = "No previous conversation history."
            result = await self.answer_my_complaints(question, user, history_str)
            metrics["faq_hit"] = False
            metrics["cache_hit"] = False
            metrics["gemini_called"] = False
            metrics["total_ms"] = round((time.perf_counter() - t_total) * 1000, 2)
            if settings.DEBUG:
                result["metrics"] = metrics
            await self._save_memory(user_id, question, result.get("answer", ""))
            return result

        # ── 4. Normalize for cache key ─────────────────────────────────
        normalized = normalize_question(question)

        # ── 5. FAQ Semantic Cache ──────────────────────────────────────
        t0 = time.perf_counter()
        faq_result = await asyncio.to_thread(self.faq_cache.search, question)
        metrics["faq_search_ms"] = round((time.perf_counter() - t0) * 1000, 2)
        metrics["faq_hit"] = faq_result.get("found", False)

        if faq_result.get("found"):
            metrics["cache_hit"] = False
            metrics["gemini_called"] = False
            metrics["total_ms"] = round((time.perf_counter() - t_total) * 1000, 2)
            logger.info(
                "FAQ HIT — faq_search=%.2f ms total=%.2f ms",
                metrics["faq_search_ms"],
                metrics["total_ms"],
            )
            result = {
                "answer": faq_result["answer"],
                "sources": ["FAQ"],
                "intent": Intent.KNOWLEDGE.value,
                "conversation_id": user_id or "anonymous",
            }
            if settings.DEBUG:
                result["metrics"] = metrics
            await self._save_memory(user_id, question, result["answer"])
            return result

        # ── 6. Response LRU Cache ──────────────────────────────────────
        t0 = time.perf_counter()
        cached = self.response_cache.get(normalized)
        metrics["response_cache_ms"] = round((time.perf_counter() - t0) * 1000, 2)
        metrics["cache_hit"] = cached is not None

        if cached is not None:
            metrics["gemini_called"] = False
            metrics["total_ms"] = round((time.perf_counter() - t_total) * 1000, 2)
            logger.info(
                "Response Cache HIT — cache_lookup=%.2f ms total=%.2f ms",
                metrics["response_cache_ms"],
                metrics["total_ms"],
            )
            result = {
                "answer": cached["answer"],
                "sources": cached.get("sources", []),
                "intent": cached.get("intent", Intent.KNOWLEDGE.value),
                "conversation_id": user_id or "anonymous",
            }
            if settings.DEBUG:
                result["metrics"] = metrics
            await self._save_memory(user_id, question, result["answer"])
            return result

        # ── 7. FAISS + Gemini (new query) ──────────────────────────────
        if user_id:
            history_str = await self.memory_service.format_history_for_prompt(user_id=user_id)
        else:
            history_str = "No previous conversation history."

        metrics["gemini_called"] = True
        result = await self.answer_from_rag(question, history_str, user_id, metrics=metrics)

        # Store in response cache for next time
        self.response_cache.put(normalized, result)
        logger.info("Gemini Response CACHED — key=%r", normalized[:60])

        metrics["total_ms"] = round((time.perf_counter() - t_total) * 1000, 2)
        logger.info(
            "Gemini CALLED — faiss=%.2f ms gemini=%.2f ms total=%.2f ms",
            metrics.get("faiss_ms", 0),
            metrics.get("gemini_ms", 0),
            metrics["total_ms"],
        )
        if settings.DEBUG:
            result["metrics"] = metrics
        await self._save_memory(user_id, question, result.get("answer", ""))
        return result

    # ──────────────────────────────────────────────────────────────────────────
    # Legacy plain-text streaming (backward compatible)
    # ──────────────────────────────────────────────────────────────────────────

    async def stream_chat(
        self, question: str, user: Optional[User] = None
    ) -> AsyncGenerator[str, None]:
        """
        Yields response chunks for the user question as an AsyncGenerator using Gemini streaming API.
        Saves user and assistant turns into MemoryService once streaming completes.
        Cache layers are checked before streaming starts.
        """
        user_id = str(user.id) if user and hasattr(user, "id") and user.id else None

        if user_id:
            history_str = await self.memory_service.format_history_for_prompt(user_id=user_id)
        else:
            history_str = "No previous conversation history."

        intent = self.router.detect(question)
        logger.info("Streaming chat query: %r with intent: %s for user_id=%s", question, intent, user_id)

        full_answer_parts: list[str] = []

        if intent == Intent.GREETING or _is_pure_greeting(question):
            yield _GREETING_RESPONSE
            full_answer_parts.append(_GREETING_RESPONSE)

        elif intent == Intent.COMPLAINT_STATUS:
            if not user:
                msg = "Please sign in to check the status of your complaints."
                yield msg
                full_answer_parts.append(msg)
            else:
                status_data = await self.complaint_tool.get_complaint_status(
                    citizen_id=user_id, question=question
                )
                if not status_data.get("found"):
                    msg = "You have not filed any grievances yet. You can submit a new complaint anytime through the portal dashboard."
                    yield msg
                    full_answer_parts.append(msg)
                else:
                    prompt = PERSONAL_DATA_PROMPT.format(
                        history=history_str,
                        complaint_data=json.dumps(status_data, indent=2),
                        question=question,
                    )
                    async for chunk in self._stream_gemini(prompt):
                        yield chunk
                        full_answer_parts.append(chunk)

        elif intent == Intent.MY_COMPLAINTS:
            if not user:
                msg = "Please sign in to view your filed grievances."
                yield msg
                full_answer_parts.append(msg)
            else:
                complaints_data = await self.complaint_tool.get_my_complaints(citizen_id=user_id)
                if not complaints_data:
                    msg = "You currently have no complaints registered in the system."
                    yield msg
                    full_answer_parts.append(msg)
                else:
                    prompt = PERSONAL_DATA_PROMPT.format(
                        history=history_str,
                        complaint_data=json.dumps(complaints_data, indent=2),
                        question=question,
                    )
                    async for chunk in self._stream_gemini(prompt):
                        yield chunk
                        full_answer_parts.append(chunk)

        else:  # KNOWLEDGE / UNKNOWN RAG — check caches first
            normalized = normalize_question(question)

            # FAQ cache check
            faq_result = await asyncio.to_thread(self.faq_cache.search, question)
            if faq_result.get("found"):
                answer = faq_result["answer"]
                yield answer
                full_answer_parts.append(answer)
            else:
                # Response cache check
                cached = self.response_cache.get(normalized)
                if cached:
                    answer = cached["answer"]
                    yield answer
                    full_answer_parts.append(answer)
                else:
                    # FAISS + Gemini
                    documents = await asyncio.to_thread(self.retriever.retrieve, question)
                    context = "\n\n".join(doc.page_content for doc in documents)
                    prompt = SYSTEM_PROMPT.format(
                        history=history_str,
                        context=context if context.strip() else "No matching documentation found.",
                        question=question,
                    )
                    full_chunks: list[str] = []
                    async for chunk in self._stream_gemini(prompt):
                        yield chunk
                        full_answer_parts.append(chunk)
                        full_chunks.append(chunk)

                    # Cache the completed response
                    sources = list({
                        doc.metadata.get("document_name", "Portal Documentation")
                        for doc in documents
                        if hasattr(doc, "metadata")
                    })
                    self.response_cache.put(normalized, {
                        "answer": "".join(full_chunks),
                        "sources": sources,
                        "intent": Intent.KNOWLEDGE.value,
                    })

        # Save turn to persistent memory after streaming finishes
        full_answer = "".join(full_answer_parts).strip()
        await self._save_memory(user_id, question, full_answer)

    # ──────────────────────────────────────────────────────────────────────────
    # SSE streaming (primary frontend endpoint)
    # ──────────────────────────────────────────────────────────────────────────

    async def stream_chat_sse(
        self, question: str, user: Optional["User"] = None
    ) -> AsyncGenerator[str, None]:
        """
        SSE streaming variant: yields JSON-encoded Server-Sent Events.
        Each chunk event: data: {"type":"chunk","text":"..."}
        Final done event: data: {"type":"done","sources":[...],"suggestions":[...]}

        Cache layers (FAQ → Response Cache → FAISS → Gemini) are applied before
        any streaming begins. Cache hits are yielded as a single chunk with no
        visible difference to the frontend.
        """
        t_total = time.perf_counter()
        user_id = str(user.id) if user and hasattr(user, "id") and user.id else None
        intent = self.router.detect(question)
        full_answer_parts: list[str] = []
        sources: List[str] = []
        metrics: Dict[str, Any] = {"intent": intent.value}

        try:
            # ── GREETING: < 5 ms static response ──────────────────────
            if intent == Intent.GREETING or _is_pure_greeting(question):
                metrics["faq_hit"] = False
                metrics["cache_hit"] = False
                metrics["gemini_called"] = False
                logger.info("Intent=GREETING SSE — static response")
                yield f"data: {json.dumps({'type': 'chunk', 'text': _GREETING_RESPONSE})}\n\n"
                full_answer_parts.append(_GREETING_RESPONSE)

            # ── COMPLAINT_STATUS: MongoDB only ─────────────────────────
            elif intent == Intent.COMPLAINT_STATUS:
                metrics["faq_hit"] = False
                metrics["cache_hit"] = False
                if not user:
                    msg = "Please sign in to access your complaint information."
                    yield f"data: {json.dumps({'type': 'chunk', 'text': msg})}\n\n"
                    full_answer_parts.append(msg)
                    metrics["gemini_called"] = False
                else:
                    data = await self.complaint_tool.get_complaint_status(
                        citizen_id=user_id, question=question
                    )
                    if not data or (isinstance(data, dict) and not data.get("found")):
                        msg = "You have no complaints registered in the system yet."
                        yield f"data: {json.dumps({'type': 'chunk', 'text': msg})}\n\n"
                        full_answer_parts.append(msg)
                        metrics["gemini_called"] = False
                    else:
                        if user_id:
                            history_str = await self.memory_service.format_history_for_prompt(user_id=user_id)
                        else:
                            history_str = "No previous conversation history."
                        prompt = PERSONAL_DATA_PROMPT.format(
                            history=history_str,
                            complaint_data=json.dumps(data, indent=2),
                            question=question,
                        )
                        sources = ["MongoDB / User Complaints"]
                        t_gemini = time.perf_counter()
                        async for chunk in self._stream_gemini(prompt):
                            yield f"data: {json.dumps({'type': 'chunk', 'text': chunk})}\n\n"
                            full_answer_parts.append(chunk)
                        metrics["gemini_ms"] = round((time.perf_counter() - t_gemini) * 1000, 2)
                        metrics["gemini_called"] = True

            # ── MY_COMPLAINTS: MongoDB only ────────────────────────────
            elif intent == Intent.MY_COMPLAINTS:
                metrics["faq_hit"] = False
                metrics["cache_hit"] = False
                if not user:
                    msg = "Please sign in to access your complaint information."
                    yield f"data: {json.dumps({'type': 'chunk', 'text': msg})}\n\n"
                    full_answer_parts.append(msg)
                    metrics["gemini_called"] = False
                else:
                    data = await self.complaint_tool.get_my_complaints(citizen_id=user_id)
                    if not data:
                        msg = "You have no complaints registered in the system yet."
                        yield f"data: {json.dumps({'type': 'chunk', 'text': msg})}\n\n"
                        full_answer_parts.append(msg)
                        metrics["gemini_called"] = False
                    else:
                        if user_id:
                            history_str = await self.memory_service.format_history_for_prompt(user_id=user_id)
                        else:
                            history_str = "No previous conversation history."
                        prompt = PERSONAL_DATA_PROMPT.format(
                            history=history_str,
                            complaint_data=json.dumps(data, indent=2),
                            question=question,
                        )
                        sources = ["MongoDB / User Complaints"]
                        t_gemini = time.perf_counter()
                        async for chunk in self._stream_gemini(prompt):
                            yield f"data: {json.dumps({'type': 'chunk', 'text': chunk})}\n\n"
                            full_answer_parts.append(chunk)
                        metrics["gemini_ms"] = round((time.perf_counter() - t_gemini) * 1000, 2)
                        metrics["gemini_called"] = True

            else:  # KNOWLEDGE / UNKNOWN — apply full cache stack
                normalized = normalize_question(question)

                # ── FAQ Semantic Cache ─────────────────────────────────
                t0 = time.perf_counter()
                faq_result = await asyncio.to_thread(self.faq_cache.search, question)
                metrics["faq_search_ms"] = round((time.perf_counter() - t0) * 1000, 2)
                metrics["faq_hit"] = faq_result.get("found", False)

                if faq_result.get("found"):
                    metrics["cache_hit"] = False
                    metrics["gemini_called"] = False
                    answer = faq_result["answer"]
                    sources = ["FAQ"]
                    yield f"data: {json.dumps({'type': 'chunk', 'text': answer})}\n\n"
                    full_answer_parts.append(answer)
                    logger.info(
                        "SSE FAQ HIT — faq_search=%.2f ms",
                        metrics["faq_search_ms"],
                    )
                else:
                    # ── Response LRU Cache ─────────────────────────────
                    t0 = time.perf_counter()
                    cached = self.response_cache.get(normalized)
                    metrics["response_cache_ms"] = round((time.perf_counter() - t0) * 1000, 2)
                    metrics["cache_hit"] = cached is not None

                    if cached is not None:
                        metrics["gemini_called"] = False
                        answer = cached["answer"]
                        sources = cached.get("sources", [])
                        yield f"data: {json.dumps({'type': 'chunk', 'text': answer})}\n\n"
                        full_answer_parts.append(answer)
                        logger.info(
                            "SSE Response Cache HIT — cache_lookup=%.2f ms",
                            metrics["response_cache_ms"],
                        )
                    else:
                        # ── FAISS + Gemini ─────────────────────────────
                        if user_id:
                            history_str = await self.memory_service.format_history_for_prompt(user_id=user_id)
                        else:
                            history_str = "No previous conversation history."

                        t_faiss = time.perf_counter()
                        documents = await asyncio.to_thread(self.retriever.retrieve, question)
                        metrics["faiss_ms"] = round((time.perf_counter() - t_faiss) * 1000, 2)

                        context = "\n\n".join(doc.page_content for doc in documents)
                        sources = list({
                            doc.metadata.get("document_name", "portal_docs")
                            for doc in documents
                            if hasattr(doc, "metadata")
                        })
                        prompt = SYSTEM_PROMPT.format(
                            history=history_str,
                            context=context if context.strip() else "No matching documentation found.",
                            question=question,
                        )

                        t_gemini = time.perf_counter()
                        full_chunks: list[str] = []
                        async for chunk in self._stream_gemini(prompt):
                            yield f"data: {json.dumps({'type': 'chunk', 'text': chunk})}\n\n"
                            full_answer_parts.append(chunk)
                            full_chunks.append(chunk)
                        metrics["gemini_ms"] = round((time.perf_counter() - t_gemini) * 1000, 2)
                        metrics["gemini_called"] = True

                        # Cache completed response
                        completed_answer = "".join(full_chunks)
                        self.response_cache.put(normalized, {
                            "answer": completed_answer,
                            "sources": sources,
                            "intent": Intent.KNOWLEDGE.value,
                        })
                        logger.info(
                            "Gemini CALLED SSE — faiss=%.2f ms gemini=%.2f ms",
                            metrics.get("faiss_ms", 0),
                            metrics.get("gemini_ms", 0),
                        )

        except Exception as exc:
            logger.error("SSE stream error for user_id=%s: %s", user_id, exc)
            yield f"data: {json.dumps({'type': 'chunk', 'text': '[An error occurred. Please try again.]'})}\n\n"

        # ── Final SSE done event with metadata ─────────────────────────
        metrics["total_ms"] = round((time.perf_counter() - t_total) * 1000, 2)
        suggestions = self._get_suggestions(intent, question)
        done_payload: Dict[str, Any] = {
            "type": "done",
            "sources": sources,
            "suggestions": suggestions,
        }
        if settings.DEBUG:
            done_payload["metrics"] = metrics
        yield f"data: {json.dumps(done_payload)}\n\n"

        logger.info(
            "SSE complete — intent=%s faq_hit=%s cache_hit=%s gemini=%s total=%.2f ms",
            intent.value,
            metrics.get("faq_hit"),
            metrics.get("cache_hit"),
            metrics.get("gemini_called"),
            metrics["total_ms"],
        )

        # ── Save to memory ─────────────────────────────────────────────
        full_answer = "".join(full_answer_parts).strip()
        await self._save_memory(user_id, question, full_answer)

    # ──────────────────────────────────────────────────────────────────────────
    # Suggestions helper
    # ──────────────────────────────────────────────────────────────────────────

    @staticmethod
    def _get_suggestions(intent: Intent, question: str = "") -> List[str]:
        """
        Returns 3 contextually varied follow-up suggestions based on intent and the current question.

        Each intent has a large pool of suggestions. Suggestions whose keywords overlap
        heavily with the current question are deprioritised so the user never sees
        follow-ups that essentially repeat what they just asked.
        """
        pools: Dict[Intent, List[str]] = {
            Intent.GREETING: [
                "How do I file a new complaint?",
                "How do I track my complaint status?",
                "Which departments handle different civic issues?",
                "How do I upload photo evidence?",
                "What happens after I submit a complaint?",
                "How long does it take to resolve a complaint?",
                "Can I check my past complaints?",
                "What types of issues can I report?",
            ],
            Intent.COMPLAINT_STATUS: [
                "What does 'In Progress' status mean?",
                "What does 'Rejected' status mean?",
                "How long does a High Priority complaint take to resolve?",
                "Who is assigned to resolve my complaint?",
                "Can I re-file a rejected complaint?",
                "How do I view my complaint history?",
                "What resolution notes will the officer add?",
                "How do I know when my complaint is resolved?",
            ],
            Intent.MY_COMPLAINTS: [
                "What is the status of my latest complaint?",
                "How do I track a specific complaint?",
                "Can I edit a submitted complaint?",
                "What happens if my complaint is rejected?",
                "How many complaints can I submit?",
                "Which of my complaints are still pending?",
                "How do I add more details to an existing complaint?",
            ],
            Intent.KNOWLEDGE: [
                "How do I track my complaint?",
                "Which department handles road issues?",
                "Which department handles water supply problems?",
                "How do I upload photo evidence?",
                "What categories of issues can I report?",
                "How long does complaint resolution take?",
                "What happens after I submit a complaint?",
                "Can I edit a complaint after submitting it?",
                "How does AI classify my complaint automatically?",
                "What image formats are accepted for evidence?",
                "How do I report a corruption issue?",
                "What is the difference between Pending and In Progress?",
            ],
            Intent.UNKNOWN: [
                "How do I file a new complaint?",
                "How do I track my complaint?",
                "What categories of issues can I report?",
                "Which department handles road issues?",
                "How do I upload evidence for a complaint?",
                "How long does it take to resolve a complaint?",
                "What does the AI assistant help with?",
            ],
        }

        pool = pools.get(intent, pools[Intent.UNKNOWN])

        stopwords = {"how", "do", "i", "a", "the", "my", "is", "of", "to",
                     "what", "can", "does", "it", "me", "an", "in", "for"}
        question_words = set(question.lower().split()) - stopwords

        def _overlap_score(suggestion: str) -> int:
            s_words = set(suggestion.lower().split()) - stopwords
            return len(s_words & question_words)

        sorted_pool = sorted(pool, key=_overlap_score)
        return sorted_pool[:3]

    # ──────────────────────────────────────────────────────────────────────────
    # RAG + Gemini helpers
    # ──────────────────────────────────────────────────────────────────────────

    async def answer_from_rag(
        self,
        question: str,
        history: str,
        user_id: Optional[str] = None,
        metrics: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Run FAISS retrieval and call Gemini. Stores timing in metrics if provided."""
        t_faiss = time.perf_counter()
        documents = await asyncio.to_thread(self.retriever.retrieve, question)
        if metrics is not None:
            metrics["faiss_ms"] = round((time.perf_counter() - t_faiss) * 1000, 2)

        context = "\n\n".join(doc.page_content for doc in documents)
        sources = list({
            doc.metadata.get("document_name", "Portal Documentation")
            for doc in documents
            if hasattr(doc, "metadata")
        })
        prompt = SYSTEM_PROMPT.format(
            history=history,
            context=context if context.strip() else "No matching documentation found.",
            question=question,
        )

        t_gemini = time.perf_counter()
        answer = await self._call_gemini(prompt)
        if metrics is not None:
            metrics["gemini_ms"] = round((time.perf_counter() - t_gemini) * 1000, 2)

        logger.info("Gemini CALLED — answer length=%d chars", len(answer))
        return {
            "answer": answer,
            "sources": sources,
            "intent": Intent.KNOWLEDGE.value,
            "conversation_id": user_id or "anonymous",
        }

    async def answer_complaint_status(
        self, question: str, user: Optional[User], user_id: Optional[str]
    ) -> Dict[str, Any]:
        """Fetch complaint status from MongoDB (no Gemini for simple status queries)."""
        if not user:
            return {
                "answer": "Please sign in to check the status of your complaints.",
                "sources": ["User Database"],
                "intent": Intent.COMPLAINT_STATUS.value,
                "conversation_id": "anonymous",
            }

        uid = user_id or str(user.id)
        status_data = await self.complaint_tool.get_complaint_status(
            citizen_id=uid,
            question=question,
        )

        if not status_data.get("found"):
            return {
                "answer": "You have not filed any grievances yet. You can submit a new complaint anytime through the portal dashboard.",
                "sources": ["MongoDB / User Complaints"],
                "intent": Intent.COMPLAINT_STATUS.value,
                "conversation_id": uid,
            }

        # For complaint status with data, format a structured response without Gemini
        complaints = status_data.get("complaints", [])
        if isinstance(complaints, list) and complaints:
            lines = ["Here are your complaint statuses:\n"]
            for c in complaints[:5]:  # Show up to 5
                lines.append(
                    f"• **{c.get('title', 'Complaint')}** — Status: {c.get('status', 'Unknown')} "
                    f"(Priority: {c.get('priority', 'N/A')})"
                )
            answer = "\n".join(lines)
        else:
            answer = f"Your complaint status: **{status_data.get('status', 'Unknown')}**."

        return {
            "answer": answer,
            "sources": ["MongoDB / User Complaints"],
            "intent": Intent.COMPLAINT_STATUS.value,
            "conversation_id": uid,
        }

    async def answer_my_complaints(
        self, question: str, user: Optional[User], history: str
    ) -> Dict[str, Any]:
        """Fetch user's complaints from MongoDB and format without Gemini."""
        if not user:
            return {
                "answer": "Please sign in to view your filed grievances.",
                "sources": ["User Database"],
                "intent": Intent.MY_COMPLAINTS.value,
                "conversation_id": "anonymous",
            }

        user_id = str(user.id)
        complaints_data = await self.complaint_tool.get_my_complaints(citizen_id=user_id)

        if not complaints_data:
            return {
                "answer": "You currently have no complaints registered in the system.",
                "sources": ["MongoDB / User Complaints"],
                "intent": Intent.MY_COMPLAINTS.value,
                "conversation_id": user_id,
            }

        # Format complaint list without Gemini
        lines = [f"You have **{len(complaints_data)}** complaint(s) on record:\n"]
        for c in complaints_data[:5]:
            lines.append(
                f"• **{c.get('title', 'Complaint')}** — {c.get('status', 'Unknown')} "
                f"(Filed: {str(c.get('created_at', 'N/A'))[:10]})"
            )
        if len(complaints_data) > 5:
            lines.append(f"\n…and {len(complaints_data) - 5} more. Visit My Complaints for the full list.")
        answer = "\n".join(lines)

        return {
            "answer": answer,
            "sources": ["MongoDB / User Complaints"],
            "intent": Intent.MY_COMPLAINTS.value,
            "conversation_id": user_id,
        }

    # ──────────────────────────────────────────────────────────────────────────
    # Gemini API wrappers (with fallback chain)
    # ──────────────────────────────────────────────────────────────────────────

    @staticmethod
    async def _call_gemini(prompt: str) -> str:
        """Call Gemini with model fallback chain. Returns the response text."""
        models = [GEMINI_MODEL, *GEMINI_FALLBACK_MODELS]

        for model in models:
            try:
                response = await asyncio.wait_for(
                    gemini_client.aio.models.generate_content(
                        model=model,
                        contents=prompt,
                        config=types.GenerateContentConfig(
                            temperature=0.2,
                        ),
                    ),
                    timeout=10.0,
                )
                if response and response.text:
                    logger.info("Gemini CALLED — model=%s", model)
                    return response.text.strip()
            except Exception as exc:
                logger.warning("Gemini model %s failed: %s. Trying fallback model.", model, exc)
                continue

        return "The AI assistant service is currently unavailable. Please try again shortly."

    @staticmethod
    async def _stream_gemini(prompt: str) -> AsyncGenerator[str, None]:
        """Invoke Gemini AI streaming with model fallback chain."""
        models = [GEMINI_MODEL, *GEMINI_FALLBACK_MODELS]

        for model in models:
            try:
                response_stream = await gemini_client.aio.models.generate_content_stream(
                    model=model,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        temperature=0.2,
                    ),
                )
                async for chunk in response_stream:
                    if chunk.text:
                        yield chunk.text
                return  # Streamed successfully
            except Exception as exc:
                logger.warning("Gemini streaming on model %s failed: %s. Trying fallback model.", model, exc)
                continue

        yield "The AI assistant service is currently unavailable. Please try again shortly."

    # ──────────────────────────────────────────────────────────────────────────
    # Memory helper
    # ──────────────────────────────────────────────────────────────────────────

    async def _save_memory(
        self, user_id: Optional[str], question: str, answer: str
    ) -> None:
        """Save a user/assistant turn to persistent conversation memory."""
        if not user_id or not answer:
            return
        try:
            await self.memory_service.save_message(user_id=user_id, role="user", message=question)
            await self.memory_service.save_message(user_id=user_id, role="assistant", message=answer)
        except Exception as exc:
            logger.error("Failed to save memory for user_id=%s: %s", user_id, exc)


# ──────────────────────────────────────────────────────────────────────────────
# Singleton accessor
# ──────────────────────────────────────────────────────────────────────────────

_chatbot_service_instance: Optional[ChatbotService] = None
_chatbot_service_lock = threading.Lock()


def get_chatbot_service() -> ChatbotService:
    """
    Thread-safe lazy singleton getter for ChatbotService.
    Ensures ChatbotService is instantiated only when first endpoint is called.
    """
    global _chatbot_service_instance
    if _chatbot_service_instance is None:
        with _chatbot_service_lock:
            if _chatbot_service_instance is None:
                logger.info("Instantiating ChatbotService singleton...")
                _chatbot_service_instance = ChatbotService()
    return _chatbot_service_instance