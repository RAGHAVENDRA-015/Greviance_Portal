from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.enums.complaint import ComplaintCategory, ComplaintPriority, ComplaintStatus
from app.schemas.common import ImageReference


class ComplaintCreate(BaseModel):
    title: str
    description: str
    category: Optional[ComplaintCategory] = None
    priority: Optional[ComplaintPriority] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    @field_validator("title", "description")
    @classmethod
    def strip_text(cls, value: str) -> str:
        return value.strip()


class ComplaintUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=5, max_length=200)
    description: Optional[str] = Field(None, min_length=10, max_length=2000)
    status: Optional[ComplaintStatus] = None
    department: Optional[str] = Field(None, max_length=120)
    assigned_officer: Optional[str] = None
    resolution_notes: Optional[str] = Field(None, max_length=2000)
    priority: Optional[ComplaintPriority] = None
    category: Optional[ComplaintCategory] = None


class StatusUpdateRequest(BaseModel):
    status: ComplaintStatus
    resolution_notes: Optional[str] = Field(None, max_length=2000)


class AssignOfficerRequest(BaseModel):
    officer_id: str
    department: Optional[str] = Field(None, max_length=120)


class ComplaintResponse(BaseModel):
    """JSON-safe complaint response; no Beanie/ObjectId values escape here."""

    id: str
    title: str
    description: str
    citizen_id: str
    category: Optional[ComplaintCategory] = None
    priority: Optional[ComplaintPriority] = None
    department: Optional[str] = None
    status: ComplaintStatus
    location: Optional[dict[str, float]] = None
    images: list[ImageReference] = Field(default_factory=list)
    ai_summary: Optional[str] = None
    ai_confidence: Optional[float] = None
    assigned_officer: Optional[str] = None
    resolution_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def from_complaint(cls, complaint) -> "ComplaintResponse":
        return cls(
            id=str(complaint.id),
            title=complaint.title,
            description=complaint.description,
            citizen_id=str(complaint.citizen_id),
            category=complaint.category,
            priority=complaint.priority,
            department=complaint.department,
            status=complaint.status,
            location=complaint.location,
            images=complaint.images,
            ai_summary=complaint.ai_summary,
            ai_confidence=complaint.ai_confidence,
            assigned_officer=str(complaint.assigned_officer) if complaint.assigned_officer else None,
            resolution_notes=complaint.resolution_notes,
            created_at=complaint.created_at,
            updated_at=complaint.updated_at,
        )


class ImageValidationResponse(BaseModel):
    relevant: bool
    reason: str

