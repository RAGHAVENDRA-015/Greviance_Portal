"""
MongoDB ChatHistory document representing saved chatbot conversations for authenticated users.
"""
from datetime import datetime
from beanie import Document
from pydantic import Field
from pymongo import ASCENDING, IndexModel

from app.models.base import utcnow


class ChatHistory(Document):
    """
    MongoDB ChatHistory document for storing user and assistant message exchanges.
    """

    user_id: str
    role: str  # "user" or "assistant"
    message: str
    created_at: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "chat_history"
        indexes = [
            IndexModel([("user_id", ASCENDING)], name="idx_chat_history_user_id"),
            IndexModel([("created_at", ASCENDING)], name="idx_chat_history_created_at"),
            IndexModel(
                [("user_id", ASCENDING), ("created_at", ASCENDING)],
                name="idx_chat_history_user_created",
            ),
        ]
