"""
UserService — business logic for user management.

All methods are static to keep the service stateless and easily testable.
Role enforcement happens at the route/dependency level, not here.
"""
import logging
from typing import List, Optional

from fastapi import HTTPException, status
from pymongo.errors import DuplicateKeyError
from app.enums.user import UserRole
from app.models.user import User
from app.schemas.user import UserUpdate, UserRoleUpdate
from app.utils.object_id import validate_object_id

logger = logging.getLogger(__name__)


class UserService:

    # ------------------------------------------------------------------
    # Authentication / Sync
    # ------------------------------------------------------------------

    @staticmethod
    async def get_or_create_user(firebase_user: dict) -> User:
        """
        Synchronize a Firebase user with MongoDB.

        - Found by firebase_uid → return existing user.
        - Not found → create new user with role=CITIZEN (default).

        Never trusts uid/email from anywhere other than the verified
        Firebase token payload.
        """
        firebase_uid = firebase_user["uid"]
        email = str(firebase_user["email"]).strip().lower()
        user = await User.find_one(User.firebase_uid == firebase_uid)

        if user:
            # Firebase remains the identity source. Keep non-authoritative
            # profile fields current without altering role or account status.
            changed = False
            display_name = firebase_user.get("name") or firebase_user.get("display_name")
            if email != user.email:
                user.email = email
                changed = True
            if display_name and display_name.strip() != user.name:
                user.name = display_name.strip()
                changed = True
            if firebase_user.get("picture") != user.profile_image:
                user.profile_image = firebase_user.get("picture")
                changed = True
            if changed:
                await user.save()
            return user

        # An email must never silently link a different Firebase UID. Firebase
        # normally guarantees uniqueness; this detects historical bad data.
        email_owner = await User.find_one(User.email == email)
        if email_owner:
            logger.error("Firebase UID/email conflict while syncing user %s", firebase_uid)
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This email is already linked to a different account. Contact support.",
            )

        # Fallback: use email prefix if display name not set in Firebase
        name = (
            firebase_user.get("name")
            or firebase_user.get("display_name")
            or (email.split("@")[0] or "Citizen")
        )

        user = User(
            firebase_uid=firebase_uid,
            name=name,
            email=email,
            profile_image=firebase_user.get("picture"),
        )

        try:
            await user.insert()
            return user
        except DuplicateKeyError:
            # A concurrent first request created the same Firebase identity.
            # Read the winner instead of turning a valid sign-in into a 500.
            existing = await User.find_one(User.firebase_uid == firebase_uid)
            if existing:
                return existing
            raise

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    @staticmethod
    async def get_user(user_id: str) -> Optional[User]:
        """Fetch a user by their MongoDB ObjectId."""
        object_id = validate_object_id(user_id)
        return await User.get(object_id)

    @staticmethod
    async def get_all_users() -> List[User]:
        """Return all users — Admin only (enforced at route level)."""
        return await User.find_all().to_list()

    @staticmethod
    async def get_users_by_role(role: UserRole) -> List[User]:
        """Return all users with a specific role."""
        return await User.find(User.role == role).to_list()

    @staticmethod
    async def get_active_officers() -> List[User]:
        """Return all verified, active officers — used by admin for assignment."""
        return await User.find(
            User.role == UserRole.OFFICER,
            User.is_active == True,
        ).to_list()

    # ------------------------------------------------------------------
    # Write — own profile
    # ------------------------------------------------------------------

    @staticmethod
    async def update_user(user_id: str, data: UserUpdate) -> Optional[User]:
        """
        Update a user's own profile fields.
        Role, firebase_uid, and email cannot be changed here.
        """
        object_id = validate_object_id(user_id)
        user = await User.get(object_id)

        if not user:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(user, key, value)

        await user.save()
        return user

    # ------------------------------------------------------------------
    # Write — admin operations
    # ------------------------------------------------------------------

    @staticmethod
    async def update_user_role(user_id: str, data: UserRoleUpdate) -> Optional[User]:
        """
        Admin-only: change a user's role.
        Separated from update_user() to enforce principle of least privilege.
        """
        object_id = validate_object_id(user_id)
        user = await User.get(object_id)

        if not user:
            return None

        user.role = data.role

        # Auto-verify when promoting to officer/admin
        if data.role in (UserRole.OFFICER, UserRole.ADMIN):
            user.is_verified = True

        await user.save()
        return user

    @staticmethod
    async def deactivate_user(user_id: str) -> Optional[User]:
        """
        Admin-only: soft-delete a user by setting is_active=False.
        Preserves data integrity — no hard deletes on user accounts.
        """
        object_id = validate_object_id(user_id)
        user = await User.get(object_id)

        if not user:
            return None

        user.is_active = False
        await user.save()
        return user

    @staticmethod
    async def reactivate_user(user_id: str) -> Optional[User]:
        """Admin-only: restore a deactivated user account."""
        object_id = validate_object_id(user_id)
        user = await User.get(object_id)

        if not user:
            return None

        user.is_active = True
        await user.save()
        return user
