from datetime import datetime
from typing import List, Optional

from beanie import Document, Replace, SaveChanges, before_event
from pydantic import Field
from pymongo import ASCENDING, IndexModel

from app.enums.complaint import ComplaintStatus, ComplaintCategory, ComplaintPriority
from app.models.base import utcnow
from app.schemas.common import ImageReference


class Complaint(Document):
    """
    MongoDB Complaint document representing a citizen grievance.
    """

    title: str

    description: str

    # MongoDB ObjectId of the citizen who submitted the complaint
    citizen_id: str

    # Enum-enforced — prevents inconsistent strings ("Roads" vs "roads" vs "ROADS")
    category: Optional[ComplaintCategory] = None

    # Enum-enforced — prevents arbitrary priority strings
    priority: Optional[ComplaintPriority] = None

    department: Optional[str] = None

    # Enum-enforced status — prevents arbitrary strings in DB
    status: ComplaintStatus = ComplaintStatus.PENDING

    location: Optional[dict] = None

    images: List[ImageReference] = Field(default_factory=list)

    # Gemini AI fields (populated after classification)
    ai_summary: Optional[str] = None
    ai_confidence: Optional[float] = None

    # MongoDB ObjectId of the assigned officer
    assigned_officer: Optional[str] = None

    resolution_notes: Optional[str] = None

    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    @before_event([Replace, SaveChanges])
    def refresh_updated_at(self) -> None:
        self.updated_at = utcnow()

    class Settings:
        name = "complaints"
        use_enum_values = True  # Store "Roads" not ComplaintCategory.ROADS in MongoDB
        indexes = [
            IndexModel([("citizen_id", ASCENDING)], name="idx_complaints_citizen_id"),
            IndexModel([("department", ASCENDING)], name="idx_complaints_department"),
            IndexModel([("status", ASCENDING)], name="idx_complaints_status"),
            IndexModel([("assigned_officer", ASCENDING)], name="idx_complaints_assigned_officer"),
        ]
