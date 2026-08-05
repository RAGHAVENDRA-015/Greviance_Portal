"""
ChatbotService — Orchestrates hybrid intent routing, RAG search, user complaint data retrieval, and conversation memory.
Supports both synchronous chat, real-time streaming, and SSE streaming responses with metadata.
"""
import asyncio
import json
import logging
from typing import Dict, Any, List, Optional, AsyncGenerator

from google.genai import types

from app.chatbot.intent_router import Intent, IntentRouter
from app.chatbot.memory import MemoryService
from app.chatbot.prompt import PERSONAL_DATA_PROMPT, SYSTEM_PROMPT
from app.chatbot.retriever import KnowledgeRetriever
from app.chatbot.tools.complaint_tool import ComplaintTool
from app.core.gemini import (
    GEMINI_FALLBACK_MODELS,
    GEMINI_MODEL,
    gemini_client,
)
from app.models.user import User

logger = logging.getLogger(__name__)


class ChatbotService:
    """
    Core Chatbot orchestrator service supporting both standard and streaming chat responses.
    """

    def __init__(
        self,
        retriever: Optional[KnowledgeRetriever] = None,
        router: Optional[IntentRouter] = None,
        complaint_tool: Optional[ComplaintTool] = None,
        memory_service: Optional[MemoryService] = None,
    ) -> None:
        self.retriever = retriever or KnowledgeRetriever()
        self.router = router or IntentRouter()
        self.complaint_tool = complaint_tool or ComplaintTool()
        self.memory_service = memory_service or MemoryService()

    async def chat(self, question: str, user: Optional[User] = None) -> Dict[str, Any]:
        """
        Main entry point for standard (non-streaming) user queries.
        Returns a dictionary containing 'answer', 'sources', 'intent', and 'conversation_id'.
        """
        user_id = str(user.id) if user and hasattr(user, "id") and user.id else None

        if user_id:
            history_str = await self.memory_service.format_history_for_prompt(user_id=user_id)
        else:
            history_str = "No previous conversation history."

        intent = self.router.detect(question)
        logger.info("Processing chat query: %r with intent: %s for user_id=%s", question, intent, user_id)

        if intent == Intent.GREETING:
            greeting_msg = "Hello! I am your Citizen Grievance Portal AI Assistant. How can I help you today with portal documentation or your filed complaints?"
            result = {
                "answer": greeting_msg,
                "sources": [],
                "intent": intent.value,
                "conversation_id": user_id or "anonymous",
            }

        elif intent == Intent.COMPLAINT_STATUS:
            result = await self.answer_complaint_status(question, user, history_str)

        elif intent == Intent.MY_COMPLAINTS:
            result = await self.answer_my_complaints(question, user, history_str)

        else:
            result = await self.answer_from_rag(question, history_str, user_id)

        if user_id and result.get("answer"):
            try:
                await self.memory_service.save_message(user_id=user_id, role="user", message=question)
                await self.memory_service.save_message(user_id=user_id, role="assistant", message=result["answer"])
            except Exception as exc:
                logger.error("Failed to save chat memory turn for user_id=%s: %s", user_id, exc)

        return result

    async def stream_chat(
        self, question: str, user: Optional[User] = None
    ) -> AsyncGenerator[str, None]:
        """
        Yields response chunks for the user question as an AsyncGenerator using Gemini streaming API.
        Saves user and assistant turns into MemoryService once streaming completes.
        """
        user_id = str(user.id) if user and hasattr(user, "id") and user.id else None

        if user_id:
            history_str = await self.memory_service.format_history_for_prompt(user_id=user_id)
        else:
            history_str = "No previous conversation history."

        intent = self.router.detect(question)
        logger.info("Streaming chat query: %r with intent: %s for user_id=%s", question, intent, user_id)

        full_answer_parts: list[str] = []

        if intent == Intent.GREETING:
            greeting_msg = "Hello! I am your Citizen Grievance Portal AI Assistant. How can I help you today with portal documentation or your filed complaints?"
            yield greeting_msg
            full_answer_parts.append(greeting_msg)

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

        else:  # KNOWLEDGE / UNKNOWN RAG
            documents = self.retriever.retrieve(question)
            context = "\n\n".join(doc.page_content for doc in documents)
            prompt = SYSTEM_PROMPT.format(
                history=history_str,
                context=context if context.strip() else "No matching documentation found.",
                question=question,
            )
            async for chunk in self._stream_gemini(prompt):
                yield chunk
                full_answer_parts.append(chunk)

        # Save turn to persistent memory after streaming finishes
        full_answer = "".join(full_answer_parts).strip()
        if user_id and full_answer:
            try:
                await self.memory_service.save_message(user_id=user_id, role="user", message=question)
                await self.memory_service.save_message(user_id=user_id, role="assistant", message=full_answer)
            except Exception as exc:
                logger.error("Failed to save streaming chat memory turn for user_id=%s: %s", user_id, exc)

    async def stream_chat_sse(
        self, question: str, user: Optional["User"] = None
    ) -> AsyncGenerator[str, None]:
        """
        SSE streaming variant: yields JSON-encoded Server-Sent Events.
        Each chunk event: data: {"type":"chunk","text":"..."}
        Final done event: data: {"type":"done","sources":[...],"suggestions":[...]}

        This lets the frontend parse structured metadata (sources, suggestions)
        at the end of the stream without a separate HTTP round-trip.
        """
        user_id = str(user.id) if user and hasattr(user, "id") and user.id else None
        intent = self.router.detect(question)
        full_answer_parts: list[str] = []
        sources: List[str] = []

        try:
            if intent == Intent.GREETING:
                greeting_msg = "Hello! I am your Citizen Grievance Portal AI Assistant. How can I help you today with portal documentation or your filed complaints?"
                yield f"data: {json.dumps({'type': 'chunk', 'text': greeting_msg})}\n\n"
                full_answer_parts.append(greeting_msg)

            elif intent in (Intent.COMPLAINT_STATUS, Intent.MY_COMPLAINTS):
                if not user:
                    msg = "Please sign in to access your complaint information."
                    yield f"data: {json.dumps({'type': 'chunk', 'text': msg})}\n\n"
                    full_answer_parts.append(msg)
                else:
                    if intent == Intent.COMPLAINT_STATUS:
                        data = await self.complaint_tool.get_complaint_status(
                            citizen_id=user_id, question=question
                        )
                    else:
                        data = await self.complaint_tool.get_my_complaints(citizen_id=user_id)

                    if not data or (isinstance(data, dict) and not data.get("found")):
                        msg = "You have no complaints registered in the system yet."
                        yield f"data: {json.dumps({'type': 'chunk', 'text': msg})}\n\n"
                        full_answer_parts.append(msg)
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
                        async for chunk in self._stream_gemini(prompt):
                            yield f"data: {json.dumps({'type': 'chunk', 'text': chunk})}\n\n"
                            full_answer_parts.append(chunk)

            else:  # KNOWLEDGE / UNKNOWN
                if user_id:
                    history_str = await self.memory_service.format_history_for_prompt(user_id=user_id)
                else:
                    history_str = "No previous conversation history."
                documents = self.retriever.retrieve(question)
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
                async for chunk in self._stream_gemini(prompt):
                    yield f"data: {json.dumps({'type': 'chunk', 'text': chunk})}\n\n"
                    full_answer_parts.append(chunk)

        except Exception as exc:
            logger.error("SSE stream error for user_id=%s: %s", user_id, exc)
            yield f"data: {json.dumps({'type': 'chunk', 'text': ' [An error occurred. Please try again.]'})}\n\n"

        # Emit final metadata event
        suggestions = self._get_suggestions(intent, question)
        yield f"data: {json.dumps({'type': 'done', 'sources': sources, 'suggestions': suggestions})}\n\n"

        # Save memory
        full_answer = "".join(full_answer_parts).strip()
        if user_id and full_answer:
            try:
                await self.memory_service.save_message(user_id=user_id, role="user", message=question)
                await self.memory_service.save_message(user_id=user_id, role="assistant", message=full_answer)
            except Exception as exc:
                logger.error("Failed to save SSE streaming memory for user_id=%s: %s", user_id, exc)

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

        # Normalise question text for keyword comparison
        stopwords = {"how", "do", "i", "a", "the", "my", "is", "of", "to",
                     "what", "can", "does", "it", "me", "an", "in", "for"}
        question_words = set(question.lower().split()) - stopwords

        def _overlap_score(suggestion: str) -> int:
            s_words = set(suggestion.lower().split()) - stopwords
            return len(s_words & question_words)

        # Sort: zero-overlap suggestions first → most novel appear at the top
        sorted_pool = sorted(pool, key=_overlap_score)
        return sorted_pool[:3]


    async def answer_from_rag(self, question: str, history: str, user_id: Optional[str] = None) -> Dict[str, Any]:
        documents = self.retriever.retrieve(question)
        context = "\n\n".join(doc.page_content for doc in documents)
        sources = list({doc.metadata.get("document_name", "Portal Documentation") for doc in documents if hasattr(doc, "metadata")})

        prompt = SYSTEM_PROMPT.format(
            history=history,
            context=context if context.strip() else "No matching documentation found.",
            question=question,
        )

        answer = await self._call_gemini(prompt)
        return {
            "answer": answer,
            "sources": sources,
            "intent": Intent.KNOWLEDGE.value,
            "conversation_id": user_id or "anonymous",
        }

    async def answer_complaint_status(self, question: str, user: Optional[User], history: str) -> Dict[str, Any]:
        if not user:
            return {
                "answer": "Please sign in to check the status of your complaints.",
                "sources": ["User Database"],
                "intent": Intent.COMPLAINT_STATUS.value,
                "conversation_id": "anonymous",
            }

        user_id = str(user.id)
        status_data = await self.complaint_tool.get_complaint_status(
            citizen_id=user_id,
            question=question,
        )

        if not status_data.get("found"):
            return {
                "answer": "You have not filed any grievances yet. You can submit a new complaint anytime through the portal dashboard.",
                "sources": ["MongoDB / User Complaints"],
                "intent": Intent.COMPLAINT_STATUS.value,
                "conversation_id": user_id,
            }

        prompt = PERSONAL_DATA_PROMPT.format(
            history=history,
            complaint_data=json.dumps(status_data, indent=2),
            question=question,
        )

        answer = await self._call_gemini(prompt)
        return {
            "answer": answer,
            "sources": ["MongoDB / User Complaints"],
            "intent": Intent.COMPLAINT_STATUS.value,
            "conversation_id": user_id,
        }

    async def answer_my_complaints(self, question: str, user: Optional[User], history: str) -> Dict[str, Any]:
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

        prompt = PERSONAL_DATA_PROMPT.format(
            history=history,
            complaint_data=json.dumps(complaints_data, indent=2),
            question=question,
        )

        answer = await self._call_gemini(prompt)
        return {
            "answer": answer,
            "sources": ["MongoDB / User Complaints"],
            "intent": Intent.MY_COMPLAINTS.value,
            "conversation_id": user_id,
        }

    @staticmethod
    async def _call_gemini(prompt: str) -> str:
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
                    return response.text.strip()
            except Exception as exc:
                logger.warning("Gemini model %s failed: %s. Trying fallback model.", model, exc)
                continue

        return "The AI assistant service is currently unavailable. Please try again shortly."

    @staticmethod
    async def _stream_gemini(prompt: str) -> AsyncGenerator[str, None]:
        """
        Helper method to invoke Gemini AI streaming with model fallback chain. Reuses app.core.gemini.
        """
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