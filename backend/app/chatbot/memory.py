"""
MemoryService — Handles storing and retrieving chatbot conversation history per user.

Responsibilities:
- Saves user messages and assistant responses to MongoDB via ChatHistory Beanie model.
- Retrieves recent conversation history for a specific user.
- Formats conversation history into clean strings for Gemini prompts.

Design:
Encapsulates all database interactions for chat history so ChatbotService remains decoupled from MongoDB models.
"""
import logging
from typing import List

from app.models.chat_history import ChatHistory

logger = logging.getLogger(__name__)


class MemoryService:
    """
    Service responsible for persistent conversation memory management.
    """

    async def save_message(self, user_id: str, role: str, message: str) -> ChatHistory:
        """
        Saves a single message (user or assistant) to MongoDB.
        """
        chat_entry = ChatHistory(
            user_id=user_id,
            role=role,
            message=message,
        )
        await chat_entry.insert()
        logger.info("Saved %s message for user_id=%s (id=%s)", role, user_id, chat_entry.id)
        return chat_entry

    async def get_history(self, user_id: str, limit: int = 10) -> List[ChatHistory]:
        """
        Retrieves the last N messages for a given user ordered chronologically (oldest to newest).
        """
        recent_entries = (
            await ChatHistory.find(ChatHistory.user_id == user_id)
            .sort(-ChatHistory.created_at)
            .limit(limit)
            .to_list()
        )
        recent_entries.reverse()
        return recent_entries

    async def format_history_for_prompt(self, user_id: str, limit: int = 10) -> str:
        """
        Formats recent conversation history into a structured string suitable for Gemini prompts.
        """
        history_records = await self.get_history(user_id=user_id, limit=limit)
        if not history_records:
            return "No previous conversation history."

        formatted_lines = []
        for record in history_records:
            speaker = "User" if record.role.lower() == "user" else "Assistant"
            formatted_lines.append(f"{speaker}: {record.message}")

        return "\n".join(formatted_lines)
