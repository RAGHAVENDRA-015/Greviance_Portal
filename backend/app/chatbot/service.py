"""
ChatbotService — Orchestrates hybrid intent routing, RAG, MongoDB tools, and conversation memory.

OPTIMIZATIONS APPLIED:
  Phase 1  — Full per-stage timing across ALL paths (greeting/FAQ/cache/RAG/Gemini/memory).
  Phase 2  — FAQ embedding cache: re-uses pre-computed query embedding downstream.
  Phase 4  — RAG: k reduced to 4, score threshold, deduplication (in retriever.py).
  Phase 5  — Compact prompt (in prompt.py): ~40% fewer static tokens.
  Phase 6  — asyncio.gather() for parallel cache lookups + memory fetch.
  Phase 8  — Compact conversation memory: 4 recent turns verbatim + earlier summary.
  Phase 9  — DB-level limits on complaint queries (in complaint_tool.py).
  Phase 11 — Memory save runs as asyncio background task, never blocks response.

Performance architecture (multi-level cache):
  Layer 1 — Greeting Detection:    < 5 ms  (static response, zero Gemini)
  Layer 2 — FAQ Semantic Cache:    < 30 ms (cosine-similarity, embedding LRU cache)
  Layer 3 — Response LRU Cache:    < 5 ms  (dict lookup, no Gemini)
  Layer 4 — Complaint Operations:  < 100 ms (MongoDB only, no Gemini for status/list)
  Layer 5 — FAISS + Gemini:        1-2 s   (fallback, cached after first call)
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

# ── Static greeting response (sub-5 ms, zero Gemini calls) ───────────────────
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
    if len(stripped.split()) <= 3:
        for kw in _GREETING_KEYWORDS:
            if stripped.startswith(kw):
                return True
    return False


class ChatbotService:
    """
    Core Chatbot orchestrator service.

    Cache layers checked in order:
        1. Intent Router (GREETING → instant static response)
        2. FAQ Semantic Cache (cosine similarity ≥ threshold, with embedding LRU cache)
        3. Response LRU Cache (exact normalized key, TTL 24h)
        4. Complaint DB (MongoDB only, no Gemini)
        5. FAISS + Gemini (new queries — result stored in Response Cache)

    All heavy components are singletons. Memory save is a background task.
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
        """Lazily initialize KnowledgeRetriever only when knowledge search is needed."""
        if self._retriever is None:
            self._retriever = KnowledgeRetriever()
        return self._retriever

    # ─────────────────────────────────────────────────────────────────────────
    # Standard chat (non-streaming)
    # ─────────────────────────────────────────────────────────────────────────

    async def chat(self, question: str, user: Optional[User] = None) -> Dict[str, Any]:
        """
        Main entry point for standard (non-streaming) user queries.
        Returns dict with 'answer', 'sources', 'intent', 'conversation_id'.
        In DEBUG mode also includes 'metrics' with per-stage latency.
        """
        t_total = time.perf_counter()
        user_id = str(user.id) if user and hasattr(user, "id") and user.id else None
        metrics: Dict[str, Any] = {}

        # ── 1. Intent detection ────────────────────────────────────────
        t0 = time.perf_counter()
        intent = self.router.detect(question)
        metrics["intent_router_ms"] = round((time.perf_counter() - t0) * 1000, 2)

        # ── 2. GREETING ────────────────────────────────────────────────
        if intent == Intent.GREETING or _is_pure_greeting(question):
            metrics.update(faq_hit=False, cache_hit=False, gemini_called=False)
            metrics["total_ms"] = round((time.perf_counter() - t_total) * 1000, 2)
            logger.info("GREETING — %.2f ms", metrics["total_ms"])
            result = {
                "answer": _GREETING_RESPONSE, "sources": [],
                "intent": Intent.GREETING.value, "conversation_id": user_id or "anonymous",
            }
            if settings.DEBUG:
                result["metrics"] = metrics
            self._schedule_memory_save(user_id, question, result["answer"])
            return result

        # ── 3. COMPLAINT_STATUS / MY_COMPLAINTS ────────────────────────
        if intent == Intent.COMPLAINT_STATUS:
            result = await self.answer_complaint_status(question, user, user_id)
            metrics.update(faq_hit=False, cache_hit=False, gemini_called=False)
            metrics["total_ms"] = round((time.perf_counter() - t_total) * 1000, 2)
            if settings.DEBUG:
                result["metrics"] = metrics
            self._schedule_memory_save(user_id, question, result.get("answer", ""))
            return result

        if intent == Intent.MY_COMPLAINTS:
            t0 = time.perf_counter()
            history_str = await self.memory_service.format_history_for_prompt(user_id=user_id) if user_id else "No previous conversation history."
            metrics["memory_fetch_ms"] = round((time.perf_counter() - t0) * 1000, 2)
            result = await self.answer_my_complaints(question, user, history_str)
            metrics.update(faq_hit=False, cache_hit=False, gemini_called=False)
            metrics["total_ms"] = round((time.perf_counter() - t_total) * 1000, 2)
            if settings.DEBUG:
                result["metrics"] = metrics
            self._schedule_memory_save(user_id, question, result.get("answer", ""))
            return result

        # ── 4. Normalize for cache key ─────────────────────────────────
        normalized = normalize_question(question)

        # ── 5. FAQ + Response cache in parallel with memory fetch ──────
        # OPTIMIZATION (Phase 6): Run FAQ search AND memory fetch concurrently.
        t0 = time.perf_counter()

        async def _faq_search():
            return await asyncio.to_thread(self.faq_cache.search, question)

        async def _memory_fetch():
            if user_id:
                return await self.memory_service.format_history_for_prompt(user_id=user_id)
            return "No previous conversation history."

        faq_result, history_str = await asyncio.gather(_faq_search(), _memory_fetch())
        metrics["faq_search_ms"] = round((time.perf_counter() - t0) * 1000, 2)
        metrics["faq_hit"] = faq_result.get("found", False)

        if faq_result.get("found"):
            metrics.update(cache_hit=False, gemini_called=False)
            metrics["total_ms"] = round((time.perf_counter() - t_total) * 1000, 2)
            logger.info("FAQ HIT — faq=%.2f ms total=%.2f ms", metrics["faq_search_ms"], metrics["total_ms"])
            result = {
                "answer": faq_result["answer"], "sources": ["FAQ"],
                "intent": Intent.KNOWLEDGE.value, "conversation_id": user_id or "anonymous",
            }
            if settings.DEBUG:
                result["metrics"] = metrics
            self._schedule_memory_save(user_id, question, result["answer"])
            return result

        # ── 6. Response LRU Cache ──────────────────────────────────────
        t0 = time.perf_counter()
        cached = self.response_cache.get(normalized)
        metrics["response_cache_ms"] = round((time.perf_counter() - t0) * 1000, 2)
        metrics["cache_hit"] = cached is not None

        if cached is not None:
            metrics.update(gemini_called=False)
            metrics["total_ms"] = round((time.perf_counter() - t_total) * 1000, 2)
            logger.info("Response Cache HIT — cache=%.2f ms total=%.2f ms", metrics["response_cache_ms"], metrics["total_ms"])
            result = {
                "answer": cached["answer"], "sources": cached.get("sources", []),
                "intent": cached.get("intent", Intent.KNOWLEDGE.value),
                "conversation_id": user_id or "anonymous",
            }
            if settings.DEBUG:
                result["metrics"] = metrics
            self._schedule_memory_save(user_id, question, result["answer"])
            return result

        # ── 7. FAISS + Gemini ──────────────────────────────────────────
        metrics["gemini_called"] = True
        result = await self.answer_from_rag(question, history_str, user_id, metrics=metrics)
        self.response_cache.put(normalized, result)
        metrics["total_ms"] = round((time.perf_counter() - t_total) * 1000, 2)
        logger.info(
            "Gemini CALLED — faiss=%.2f ms gemini=%.2f ms total=%.2f ms",
            metrics.get("faiss_ms", 0), metrics.get("gemini_ms", 0), metrics["total_ms"],
        )
        if settings.DEBUG:
            result["metrics"] = metrics
        self._schedule_memory_save(user_id, question, result.get("answer", ""))
        return result


    # ─────────────────────────────────────────────────────────────────────────
    # SSE streaming — primary frontend endpoint
    # ─────────────────────────────────────────────────────────────────────────

    async def stream_chat_sse(
        self, question: str, user: Optional["User"] = None
    ) -> AsyncGenerator[str, None]:
        """
        SSE streaming variant. Yields JSON-encoded Server-Sent Events:
          data: {"type":"chunk","text":"..."}   — one per Gemini token
          data: {"type":"done","sources":[...],"suggestions":[...]}

        OPTIMIZATIONS:
          Phase 1  — Full per-stage timing in every code path.
          Phase 6  — Intent detection + FAQ search + memory fetch run in parallel
                     before the first Gemini token, minimising time-to-first-token.
          Phase 11 — Memory save is a fire-and-forget background task.
        """
        t_total = time.perf_counter()
        user_id = str(user.id) if user and hasattr(user, "id") and user.id else None
        full_answer_parts: list[str] = []
        sources: List[str] = []
        metrics: Dict[str, Any] = {}
        intent = Intent.UNKNOWN  # safe default in case preflight raises early

        try:
            # ── Phase 6: Parallel pre-flight ───────────────────────────
            # Run intent detection (CPU-bound) + FAQ search (CPU+embedding) +
            # memory fetch (I/O) all at the same time.
            t_preflight = time.perf_counter()

            def _detect_and_faq():
                """CPU-bound intent detect + FAQ search (runs in thread pool)."""
                intent_result = self.router.detect(question)
                # Only run FAQ search for non-special intents to avoid wasted work
                if intent_result not in (Intent.GREETING, Intent.COMPLAINT_STATUS, Intent.MY_COMPLAINTS):
                    faq_result = self.faq_cache.search(question)
                else:
                    faq_result = {"found": False}
                return intent_result, faq_result

            async def _fetch_memory():
                if user_id:
                    return await self.memory_service.format_history_for_prompt(user_id=user_id)
                return "No previous conversation history."

            (intent, faq_result), history_str = await asyncio.gather(
                asyncio.to_thread(_detect_and_faq),
                _fetch_memory(),
            )

            metrics["preflight_ms"] = round((time.perf_counter() - t_preflight) * 1000, 2)
            metrics["intent"] = intent.value
            metrics["faq_hit"] = faq_result.get("found", False)

            # ── GREETING: < 5 ms static response ──────────────────────
            if intent == Intent.GREETING or _is_pure_greeting(question):
                metrics.update(cache_hit=False, gemini_called=False)
                yield f"data: {json.dumps({'type': 'chunk', 'text': _GREETING_RESPONSE})}\n\n"
                full_answer_parts.append(_GREETING_RESPONSE)

            # ── COMPLAINT_STATUS: MongoDB only ─────────────────────────
            elif intent == Intent.COMPLAINT_STATUS:
                metrics.update(cache_hit=False, faq_hit=False)
                if not user:
                    msg = "Please sign in to access your complaint information."
                    yield f"data: {json.dumps({'type': 'chunk', 'text': msg})}\n\n"
                    full_answer_parts.append(msg)
                    metrics["gemini_called"] = False
                else:
                    t_db = time.perf_counter()
                    data = await self.complaint_tool.get_complaint_status(
                        citizen_id=user_id, question=question
                    )
                    metrics["db_ms"] = round((time.perf_counter() - t_db) * 1000, 2)

                    if not data or (isinstance(data, dict) and not data.get("found")):
                        msg = "You have no complaints registered in the system yet."
                        yield f"data: {json.dumps({'type': 'chunk', 'text': msg})}\n\n"
                        full_answer_parts.append(msg)
                        metrics["gemini_called"] = False
                    else:
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
                metrics.update(cache_hit=False, faq_hit=False)
                if not user:
                    msg = "Please sign in to access your complaint information."
                    yield f"data: {json.dumps({'type': 'chunk', 'text': msg})}\n\n"
                    full_answer_parts.append(msg)
                    metrics["gemini_called"] = False
                else:
                    t_db = time.perf_counter()
                    data = await self.complaint_tool.get_my_complaints(citizen_id=user_id)
                    metrics["db_ms"] = round((time.perf_counter() - t_db) * 1000, 2)

                    if not data:
                        msg = "You have no complaints registered in the system yet."
                        yield f"data: {json.dumps({'type': 'chunk', 'text': msg})}\n\n"
                        full_answer_parts.append(msg)
                        metrics["gemini_called"] = False
                    else:
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


            else:  # KNOWLEDGE / UNKNOWN — full cache stack
                normalized = normalize_question(question)

                # ── FAQ hit (already searched in preflight) ────────────
                if faq_result.get("found"):
                    metrics["cache_hit"] = False
                    metrics["gemini_called"] = False
                    answer = faq_result["answer"]
                    sources = ["FAQ"]
                    yield f"data: {json.dumps({'type': 'chunk', 'text': answer})}\n\n"
                    full_answer_parts.append(answer)
                    logger.info("SSE FAQ HIT — preflight=%.2f ms", metrics["preflight_ms"])

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
                        logger.info("SSE Cache HIT — cache=%.2f ms", metrics["response_cache_ms"])

                    else:
                        # ── FAISS + Gemini ─────────────────────────────
                        t_faiss = time.perf_counter()
                        documents = await asyncio.to_thread(self.retriever.retrieve, question)
                        metrics["faiss_ms"] = round((time.perf_counter() - t_faiss) * 1000, 2)

                        # Build compact context (Phase 4/5: only relevant, deduped chunks)
                        t_prompt = time.perf_counter()
                        context = "\n\n".join(doc.page_content for doc in documents)
                        sources = list({
                            doc.metadata.get("document_name", "portal_docs")
                            for doc in documents if hasattr(doc, "metadata")
                        })
                        prompt = SYSTEM_PROMPT.format(
                            history=history_str,
                            context=context if context.strip() else "No matching documentation found.",
                            question=question,
                        )
                        metrics["prompt_build_ms"] = round((time.perf_counter() - t_prompt) * 1000, 2)

                        t_gemini = time.perf_counter()
                        full_chunks: list[str] = []
                        async for chunk in self._stream_gemini(prompt):
                            yield f"data: {json.dumps({'type': 'chunk', 'text': chunk})}\n\n"
                            full_answer_parts.append(chunk)
                            full_chunks.append(chunk)
                        metrics["gemini_ms"] = round((time.perf_counter() - t_gemini) * 1000, 2)
                        metrics["gemini_called"] = True

                        # Cache completed response (background, non-blocking)
                        completed_answer = "".join(full_chunks)
                        self.response_cache.put(normalized, {
                            "answer": completed_answer,
                            "sources": sources,
                            "intent": Intent.KNOWLEDGE.value,
                        })
                        logger.info(
                            "SSE Gemini — preflight=%.2f ms faiss=%.2f ms prompt=%.2f ms gemini=%.2f ms",
                            metrics["preflight_ms"], metrics["faiss_ms"],
                            metrics["prompt_build_ms"], metrics["gemini_ms"],
                        )

        except Exception as exc:
            logger.error("SSE stream error for user_id=%s: %s", user_id, exc, exc_info=True)
            yield f"data: {json.dumps({'type': 'chunk', 'text': '[An error occurred. Please try again.]'})}\n\n"

        # ── Final done event ───────────────────────────────────────────
        metrics["total_ms"] = round((time.perf_counter() - t_total) * 1000, 2)
        suggestions = self._get_suggestions(intent, question)
        done_payload: Dict[str, Any] = {
            "type": "done", "sources": sources, "suggestions": suggestions,
        }
        if settings.DEBUG:
            done_payload["metrics"] = metrics
        yield f"data: {json.dumps(done_payload)}\n\n"

        logger.info(
            "SSE complete — intent=%s faq=%s cache=%s gemini=%s total=%.2f ms",
            intent.value, metrics.get("faq_hit"), metrics.get("cache_hit"),
            metrics.get("gemini_called"), metrics["total_ms"],
        )

        # ── Phase 11: Save memory as background task ───────────────────
        full_answer = "".join(full_answer_parts).strip()
        self._schedule_memory_save(user_id, question, full_answer)


    # ─────────────────────────────────────────────────────────────────────────
    # Legacy plain-text streaming (backward compatible)
    # ─────────────────────────────────────────────────────────────────────────

    async def stream_chat(
        self, question: str, user: Optional[User] = None
    ) -> AsyncGenerator[str, None]:
        """
        Plain-text streaming endpoint (backward compatible).
        Delegates to the optimized SSE path and strips the SSE framing.
        """
        user_id = str(user.id) if user and hasattr(user, "id") and user.id else None
        intent = self.router.detect(question)
        full_answer_parts: list[str] = []

        if intent == Intent.GREETING or _is_pure_greeting(question):
            yield _GREETING_RESPONSE
            full_answer_parts.append(_GREETING_RESPONSE)
        elif intent == Intent.COMPLAINT_STATUS:
            result = await self.answer_complaint_status(question, user, user_id)
            answer = result.get("answer", "")
            yield answer
            full_answer_parts.append(answer)
        elif intent == Intent.MY_COMPLAINTS:
            history_str = await self.memory_service.format_history_for_prompt(user_id=user_id) if user_id else "No previous conversation history."
            result = await self.answer_my_complaints(question, user, history_str)
            answer = result.get("answer", "")
            yield answer
            full_answer_parts.append(answer)
        else:
            normalized = normalize_question(question)
            faq_result = await asyncio.to_thread(self.faq_cache.search, question)
            if faq_result.get("found"):
                yield faq_result["answer"]
                full_answer_parts.append(faq_result["answer"])
            else:
                cached = self.response_cache.get(normalized)
                if cached:
                    yield cached["answer"]
                    full_answer_parts.append(cached["answer"])
                else:
                    history_str = await self.memory_service.format_history_for_prompt(user_id=user_id) if user_id else "No previous conversation history."
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
                    sources = list({doc.metadata.get("document_name", "portal_docs") for doc in documents if hasattr(doc, "metadata")})
                    self.response_cache.put(normalized, {"answer": "".join(full_chunks), "sources": sources, "intent": Intent.KNOWLEDGE.value})

        self._schedule_memory_save(user_id, question, "".join(full_answer_parts).strip())


    # ─────────────────────────────────────────────────────────────────────────
    # RAG + Gemini helpers
    # ─────────────────────────────────────────────────────────────────────────

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

        t_prompt = time.perf_counter()
        context = "\n\n".join(doc.page_content for doc in documents)
        sources = list({
            doc.metadata.get("document_name", "Portal Documentation")
            for doc in documents if hasattr(doc, "metadata")
        })
        prompt = SYSTEM_PROMPT.format(
            history=history,
            context=context if context.strip() else "No matching documentation found.",
            question=question,
        )
        if metrics is not None:
            metrics["prompt_build_ms"] = round((time.perf_counter() - t_prompt) * 1000, 2)

        t_gemini = time.perf_counter()
        answer = await self._call_gemini(prompt)
        if metrics is not None:
            metrics["gemini_ms"] = round((time.perf_counter() - t_gemini) * 1000, 2)

        return {
            "answer": answer, "sources": sources,
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
        status_data = await self.complaint_tool.get_complaint_status(citizen_id=uid, question=question)

        if not status_data.get("found"):
            return {
                "answer": "You have not filed any grievances yet. Submit a new complaint anytime through the dashboard.",
                "sources": ["MongoDB / User Complaints"],
                "intent": Intent.COMPLAINT_STATUS.value,
                "conversation_id": uid,
            }

        complaints = status_data.get("complaints", [])
        if isinstance(complaints, list) and complaints:
            lines = ["Here are your complaint statuses:\n"]
            for c in complaints[:5]:
                lines.append(
                    f"• **{c.get('title', 'Complaint')}** — Status: {c.get('status', 'Unknown')} "
                    f"(Priority: {c.get('priority', 'N/A')})"
                )
            answer = "\n".join(lines)
        else:
            answer = f"Your complaint status: **{status_data.get('status', 'Unknown')}**."

        return {
            "answer": answer, "sources": ["MongoDB / User Complaints"],
            "intent": Intent.COMPLAINT_STATUS.value, "conversation_id": uid,
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
                "intent": Intent.MY_COMPLAINTS.value, "conversation_id": user_id,
            }

        lines = [f"You have **{len(complaints_data)}** complaint(s) on record:\n"]
        for c in complaints_data[:5]:
            lines.append(
                f"• **{c.get('title', 'Complaint')}** — {c.get('status', 'Unknown')} "
                f"(Filed: {str(c.get('created_at', 'N/A'))[:10]})"
            )
        if len(complaints_data) > 5:
            lines.append(f"\n…and {len(complaints_data) - 5} more. Visit My Complaints for the full list.")
        return {
            "answer": "\n".join(lines), "sources": ["MongoDB / User Complaints"],
            "intent": Intent.MY_COMPLAINTS.value, "conversation_id": user_id,
        }


    # ─────────────────────────────────────────────────────────────────────────
    # Gemini API wrappers (with fallback chain)
    # ─────────────────────────────────────────────────────────────────────────

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
                        config=types.GenerateContentConfig(temperature=0.2),
                    ),
                    timeout=10.0,
                )
                if response and response.text:
                    return response.text.strip()
            except Exception as exc:
                logger.warning("Gemini model %s failed: %s — trying fallback.", model, exc)
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
                    config=types.GenerateContentConfig(temperature=0.2),
                )
                async for chunk in response_stream:
                    if chunk.text:
                        yield chunk.text
                return
            except Exception as exc:
                logger.warning("Gemini streaming on %s failed: %s — trying fallback.", model, exc)
                continue
        yield "The AI assistant service is currently unavailable. Please try again shortly."

    # ─────────────────────────────────────────────────────────────────────────
    # Phase 11: Background task memory save
    # ─────────────────────────────────────────────────────────────────────────

    def _schedule_memory_save(
        self, user_id: Optional[str], question: str, answer: str
    ) -> None:
        """
        Schedule a fire-and-forget coroutine to persist the conversation turn.

        OPTIMIZATION (Phase 11): Memory writes are non-critical for response quality.
        By scheduling them as background asyncio tasks, they never block the response
        path — the SSE 'done' event is sent to the client before the DB write begins.
        """
        if not user_id or not answer:
            return
        asyncio.ensure_future(self._save_turn_bg(user_id, question, answer))

    async def _save_turn_bg(self, user_id: str, question: str, answer: str) -> None:
        """Background coroutine: bulk-inserts user + assistant messages in one round-trip."""
        try:
            await self.memory_service.save_turn(user_id=user_id, question=question, answer=answer)
        except Exception as exc:
            logger.error("Background memory save failed for user_id=%s: %s", user_id, exc)

    # ─────────────────────────────────────────────────────────────────────────
    # Suggestion chips helper
    # ─────────────────────────────────────────────────────────────────────────

    @staticmethod
    def _get_suggestions(intent: Intent, question: str = "") -> List[str]:
        """Return 3 contextually varied follow-up suggestions based on intent."""
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
                "How do I know when my complaint is resolved?",
            ],
            Intent.MY_COMPLAINTS: [
                "What is the status of my latest complaint?",
                "How do I track a specific complaint?",
                "Can I edit a submitted complaint?",
                "What happens if my complaint is rejected?",
                "Which of my complaints are still pending?",
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
                "What is the difference between Pending and In Progress?",
            ],
            Intent.UNKNOWN: [
                "How do I file a new complaint?",
                "How do I track my complaint?",
                "What categories of issues can I report?",
                "Which department handles road issues?",
                "How long does it take to resolve a complaint?",
            ],
        }

        pool = pools.get(intent, pools[Intent.UNKNOWN])
        stopwords = {"how", "do", "i", "a", "the", "my", "is", "of", "to",
                     "what", "can", "does", "it", "me", "an", "in", "for"}
        question_words = set(question.lower().split()) - stopwords

        def _overlap(suggestion: str) -> int:
            return len((set(suggestion.lower().split()) - stopwords) & question_words)

        return sorted(pool, key=_overlap)[:3]


# ─────────────────────────────────────────────────────────────────────────────
# Thread-safe singleton accessor
# ─────────────────────────────────────────────────────────────────────────────

_chatbot_service_instance: Optional[ChatbotService] = None
_chatbot_service_lock = threading.Lock()


def get_chatbot_service() -> ChatbotService:
    """Thread-safe lazy singleton getter for ChatbotService."""
    global _chatbot_service_instance
    if _chatbot_service_instance is None:
        with _chatbot_service_lock:
            if _chatbot_service_instance is None:
                logger.info("Instantiating ChatbotService singleton...")
                _chatbot_service_instance = ChatbotService()
    return _chatbot_service_instance
