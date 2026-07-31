from datetime import datetime
from typing import Optional

from beanie import Document, Replace, SaveChanges, before_event
from pydantic import EmailStr, Field
from pymongo import ASCENDING, IndexModel

from app.enums.user import UserRole
from app.models.base import utcnow


class User(Document):
    """
    MongoDB User document synchronized from Firebase Authentication.

    Roles:
        - CITIZEN  (default): standard end user
        - OFFICER: government officer assigned to a department
        - ADMIN: system administrator with full access
    """

    firebase_uid: str

    name: str

    email: EmailStr

    phone: Optional[str] = None

    role: UserRole = UserRole.CITIZEN

    department: Optional[str] = None

    profile_image: Optional[str] = None

    address: Optional[str] = None

    is_active: bool = True

    # For officer accounts — set True once admin verifies them
    is_verified: bool = False

    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    @before_event([Replace, SaveChanges])
    def refresh_updated_at(self) -> None:
        self.updated_at = utcnow()

    class Settings:
        name = "users"
        use_enum_values = True  # Store "citizen" not UserRole.CITIZEN in MongoDB
        indexes = [
            IndexModel([("firebase_uid", ASCENDING)], unique=True, name="uniq_firebase_uid"),
            IndexModel([("email", ASCENDING)], unique=True, name="uniq_email"),
        ]
