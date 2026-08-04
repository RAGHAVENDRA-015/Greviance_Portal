from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr

from app.enums.user import UserRole


class UserResponse(BaseModel):
    id: str
    firebase_uid: str
    name: str
    email: EmailStr
    phone: Optional[str] = None
    address: Optional[str] = None
    profile_image: Optional[str] = None
    department: Optional[str] = None
    role: UserRole
    is_active: bool
    is_verified: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def from_user(cls, user):
        return cls(
            id=str(user.id),
            firebase_uid=user.firebase_uid,
            name=user.name,
            email=user.email,
            phone=user.phone,
            address=user.address,
            profile_image=user.profile_image,
            department=user.department,
            role=user.role,
            is_active=user.is_active,
            is_verified=user.is_verified,
            created_at=user.created_at,
        )


class UserUpdate(BaseModel):
    """Fields a user can update on their own profile."""

    name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    profile_image: Optional[str] = None


class UserRoleUpdate(BaseModel):
    """Admin-only: update a user's role."""

    role: UserRole