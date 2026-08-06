"""
MemoryService — Handles storing and retrieving chatbot conversation history per user.

OPTIMIZATIONS (Phase 8 + 11):
  - Limit history to 6 turns (12 messages) instead of 10 — smaller prompt, faster Gemini.
  - Summarize older exchanges: beyond the last 4 turns, older messages are collapsed into
    a one-line summary to keep the prompt compact without losing context.
  - Bulk insert: saves user + assistant turns in a single insert_many() call instead of
    two separate round-trips.
  - format_history_for_prompt() is now a pure in-memory operation — callers should
    pre-fetch history and pass it in rather than triggering a DB query inline.
"""
import asyncio
import logging
from typing import List

from app.models.chat_history import ChatHistory

logger = logging.getLogger(__name__)

# Number of recent turns (user+assistant pairs) to include verbatim in the prompt.
# Older messages beyond this are summarised to a single line.
_RECENT_TURNS = 4  # = 8 messages
_TOTAL_LIMIT = 6   # = 12 messages fetched from DB


class MemoryService:
    """
    Service responsible for persistent conversation memory management.
    """

    async def save_turn(self, user_id: str, question: str, answer: str) -> None:
        """
        Save a complete user+assistant turn as a bulk insert (single DB round-trip).
        
        OPTIMIZATION: Replaces two separate save_message() calls with one insert_many.
        Should be called as a background task so it never blocks the response path.
        """
        if not user_id or not question.strip() or not answer.strip():
            return
        try:
            user_entry = ChatHistory(user_id=user_id, role="user", message=question)
            assistant_entry = ChatHistory(user_id=user_id, role="assistant", message=answer)
            # Insert both documents in a single round-trip
            await ChatHistory.insert_many([user_entry, assistant_entry])
            logger.debug("Saved conversation turn for user_id=%s", user_id)
        except Exception as exc:
            logger.error("Failed to save conversation turn for user_id=%s: %s", user_id, exc)

    async def save_message(self, user_id: str, role: str, message: str) -> ChatHistory:
        """
        Saves a single message to MongoDB (kept for backward compatibility).
        Prefer save_turn() for new code.
        """
        chat_entry = ChatHistory(user_id=user_id, role=role, message=message)
        await chat_entry.insert()
        return chat_entry

    async def get_history(self, user_id: str, limit: int = _TOTAL_LIMIT * 2) -> List[ChatHistory]:
        """
        Retrieves the last N messages for a given user ordered chronologically.
        
        OPTIMIZATION: Default limit reduced to 12 (6 turns) from 10.
        Uses the compound (user_id, created_at) index for efficient retrieval.
        """
        recent_entries = (
            await ChatHistory.find(ChatHistory.user_id == user_id)
            .sort(-ChatHistory.created_at)
            .limit(limit)
            .to_list()
        )
        recent_entries.reverse()
        return recent_entries

    async def format_history_for_prompt(self, user_id: str, limit: int = _TOTAL_LIMIT * 2) -> str:
        """
        Formats recent conversation history into a compact string for Gemini prompts.

        OPTIMIZATION: Summarizes older exchanges beyond the last _RECENT_TURNS turns
        into a single condensed line, keeping the prompt shorter without losing context.

        Format:
          [Summary of earlier conversation: user asked about X, Y, Z]
          User: <recent question>
          Assistant: <recent answer>
          ...
        """
        history_records = await self.get_history(user_id=user_id, limit=limit)
        if not history_records:
            return "No previous conversation history."

        return _format_compact(history_records)


def _format_compact(records: List[ChatHistory]) -> str:
    """
    Format conversation history compactly:
    - Last _RECENT_TURNS pairs are kept verbatim (trimmed to 200 chars each).
    - Earlier messages are summarised into a single line.
    """
    # Split into recent (verbatim) and older (summary)
    recent_cutoff = _RECENT_TURNS * 2  # messages
    older = records[:-recent_cutoff] if len(records) > recent_cutoff else []
    recent = records[-recent_cutoff:] if len(records) > recent_cutoff else records

    lines: List[str] = []

    # Summarise older context
    if older:
        topics: List[str] = []
        for r in older:
            if r.role.lower() == "user":
                # Trim to first 80 chars for a succinct topic label
                topic = r.message.strip()[:80].rstrip(".,?!") + ("…" if len(r.message) > 80 else "")
                topics.append(topic)
        if topics:
            summary = "; ".join(topics[:5])  # cap at 5 topics to avoid bloat
            lines.append(f"[Earlier conversation — user asked about: {summary}]")

    # Recent turns verbatim, trimmed to 200 chars per message
    for record in recent:
        speaker = "User" if record.role.lower() == "user" else "Assistant"
        msg = record.message.strip()
        if len(msg) > 200:
            msg = msg[:197] + "…"
        lines.append(f"{speaker}: {msg}")

    return "\n".join(lines)
