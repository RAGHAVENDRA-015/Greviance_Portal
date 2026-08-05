"""
FastAPI Routes for the Hybrid AI Chatbot with Conversation Memory & Real-Time SSE Streaming.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse

from app.api.dependencies import get_current_user, get_optional_current_user
from app.chatbot.schemas import ChatRequest, ChatResponse
from app.chatbot.service import ChatbotService, get_chatbot_service
from app.models.user import User

router = APIRouter(
    prefix="/chatbot",
    tags=["Chatbot"],
)

# Separate router for /chat prefix (used by streaming endpoint)
chat_router = APIRouter(
    prefix="/chat",
    tags=["Chatbot"],
)


@router.post(
    "",
    response_model=ChatResponse,
    summary="Process user query via Hybrid AI Chatbot",
)
async def chat(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    service: ChatbotService = Depends(get_chatbot_service),
) -> ChatResponse:
    """
    Standard synchronous chatbot endpoint.
    """
    result = await service.chat(
        question=request.message,
        user=current_user,
    )

    return ChatResponse(
        answer=result["answer"],
        sources=result.get("sources", []),
        intent=result.get("intent"),
        conversation_id=result.get("conversation_id", str(current_user.id)),
    )


@router.post(
    "/stream",
    summary="Stream AI chat response (legacy plain-text)",
)
async def chat_stream_legacy(
    message: Optional[str] = Query(None),
    request: Optional[ChatRequest] = None,
    current_user: Optional[User] = Depends(get_optional_current_user),
    service: ChatbotService = Depends(get_chatbot_service),
):
    """
    Legacy plain-text streaming endpoint. Preserved for backward compatibility.
    """
    query_text = (request.message if request and request.message else message) or ""
    if not query_text.strip():
        raise HTTPException(status_code=422, detail="Message is required.")

    return StreamingResponse(
        service.stream_chat(question=query_text.strip(), user=current_user),
        media_type="text/plain; charset=utf-8",
    )


@chat_router.post(
    "/stream",
    summary="Stream AI chat response as Server-Sent Events (SSE)",
)
async def chat_stream_sse(
    request: ChatRequest,
    current_user: Optional[User] = Depends(get_optional_current_user),
    service: ChatbotService = Depends(get_chatbot_service),
):
    """
    Real-time SSE streaming endpoint for ChatGPT-style typing responses.
    Yields JSON-encoded Server-Sent Events:
      - data: {"type":"chunk","text":"..."}
      - data: {"type":"done","sources":[...],"suggestions":[...]}
    """
    if not request.message.strip():
        raise HTTPException(status_code=422, detail="Message is required.")

    return StreamingResponse(
        service.stream_chat_sse(question=request.message.strip(), user=current_user),
        media_type="text/event-stream; charset=utf-8",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable Nginx buffering for SSE
        },
    )