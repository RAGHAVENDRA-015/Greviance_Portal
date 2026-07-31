from typing import Dict, List

from pydantic import BaseModel, Field


class MessageResponse(BaseModel):
    """Generic success message response."""
    message: str


class ImageReference(BaseModel):
    """Cloudinary image reference."""
    url: str
    public_id: str


class DashboardStats(BaseModel):
    """
    Analytics payload returned by the admin dashboard endpoint.
    """
    total_complaints: int
    pending: int
    in_progress: int
    resolved: int
    rejected: int
    total_users: int
    total_officers: int
    by_department: Dict[str, int]
    recent_complaints: List[dict] = Field(default_factory=list)
