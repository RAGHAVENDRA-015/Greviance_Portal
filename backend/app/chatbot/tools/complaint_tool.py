"""
ComplaintTool — Data retrieval tool for the chatbot service.

Responsibilities:
- Acts as a bridge between the ChatbotService and ComplaintService.
- Does NOT access MongoDB directly (preserves layering and business logic encapsulation).
- Queries user-specific complaints strictly using citizen_id.

All operations delegate directly to ComplaintService.
"""
import logging
import re
from typing import Any, Dict, List, Optional

from app.models.complaint import Complaint
from app.services.complaint_service import ComplaintService

logger = logging.getLogger(__name__)


class ComplaintTool:
    """
    Tool interface for retrieving user complaint data for the chatbot.
    Delegates all database access to ComplaintService.
    """

    async def get_my_complaints(self, citizen_id: str) -> List[Dict[str, Any]]:
        """
        Fetch all complaints submitted by the authenticated citizen.
        Returns a list of structured dictionaries for prompt generation.
        """
        logger.info("ComplaintTool: Fetching complaints for citizen_id=%s", citizen_id)
        complaints: List[Complaint] = await ComplaintService.get_complaints_by_citizen(citizen_id)
        return [self._format_complaint(c) for c in complaints]

    async def get_recent_complaints(self, citizen_id: str, limit: int = 5) -> List[Dict[str, Any]]:
        """
        Fetch the N most recent complaints for the citizen.
        """
        complaints: List[Complaint] = await ComplaintService.get_complaints_by_citizen(citizen_id)
        recent = complaints[:limit]
        return [self._format_complaint(c) for c in recent]

    async def get_complaint_status(
        self,
        citizen_id: str,
        question: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Retrieves status for a complaint. If a 24-character hexadecimal ObjectId
        is detected in the question string, fetches that specific complaint.
        Otherwise, defaults to the user's latest complaint.
        """
        complaints: List[Complaint] = await ComplaintService.get_complaints_by_citizen(citizen_id)

        if not complaints:
            return {"found": False, "message": "No complaints found for this account."}

        # Attempt to extract explicit Mongo ObjectId from question if present
        if question:
            match = re.search(r"\b[0-9a-fA-F]{24}\b", question)
            if match:
                complaint_id = match.group(0)
                complaint = await ComplaintService.get_complaint(complaint_id)
                if complaint and complaint.citizen_id == citizen_id:
                    return {"found": True, "complaint": self._format_complaint(complaint)}

        # Default to the most recent complaint
        latest_complaint = complaints[0]
        return {
            "found": True,
            "complaint": self._format_complaint(latest_complaint),
            "total_user_complaints": len(complaints),
        }

    async def summarize_complaints(self, citizen_id: str) -> Dict[str, Any]:
        """
        Generates a summary of complaint counts by status for the citizen.
        """
        complaints: List[Complaint] = await ComplaintService.get_complaints_by_citizen(citizen_id)
        if not complaints:
            return {"total": 0, "summary": "No grievances registered yet."}

        status_counts: Dict[str, int] = {}
        for c in complaints:
            st = str(c.status.value if hasattr(c.status, "value") else c.status)
            status_counts[st] = status_counts.get(st, 0) + 1

        return {
            "total": len(complaints),
            "status_breakdown": status_counts,
            "recent_complaint": self._format_complaint(complaints[0]),
        }

    @staticmethod
    def _format_complaint(complaint: Complaint) -> Dict[str, Any]:
        """
        Formats a Complaint beanie model into a clean, serializable dict for AI prompts.
        """
        return {
            "id": str(complaint.id),
            "title": complaint.title,
            "description": complaint.description,
            "category": str(complaint.category.value if hasattr(complaint.category, "value") else complaint.category) if complaint.category else "Unclassified",
            "priority": str(complaint.priority.value if hasattr(complaint.priority, "value") else complaint.priority) if complaint.priority else "Medium",
            "status": str(complaint.status.value if hasattr(complaint.status, "value") else complaint.status),
            "department": complaint.department or "Unassigned",
            "ai_summary": complaint.ai_summary or "None",
            "resolution_notes": complaint.resolution_notes or "None",
            "created_at": complaint.created_at.strftime("%Y-%m-%d %H:%M:%S") if complaint.created_at else "Unknown",
            "updated_at": complaint.updated_at.strftime("%Y-%m-%d %H:%M:%S") if complaint.updated_at else "Unknown",
        }
