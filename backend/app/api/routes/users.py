"""
User Routes — RBAC-guarded.

Permission matrix:
    GET    /users/me            → Any authenticated user
    PUT    /users/me            → Any authenticated user (own profile only)
    GET    /users/              → ADMIN only
    GET    /users/{user_id}     → ADMIN only
    PUT    /users/{user_id}/role   → ADMIN only
    DELETE /users/{user_id}     → ADMIN only
"""
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.dependencies import get_current_user, require_roles
from app.enums.user import UserRole
from app.models.user import User
from app.schemas.common import MessageResponse
from app.schemas.user import UserResponse, UserRoleUpdate, UserUpdate
from app.services.user_service import UserService

router = APIRouter(
    prefix="/users",
    tags=["Users"],
)


# ---------------------------------------------------------------------------
# GET /users/me — Own profile (any authenticated user)
# NOTE: Must be declared BEFORE /{user_id} to avoid route shadowing.
# ---------------------------------------------------------------------------

@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get my profile",
)
async def get_my_profile(
    current_user: User = Depends(get_current_user),
):
    """Returns the authenticated user's own profile."""
    return UserResponse.from_user(current_user)


# ---------------------------------------------------------------------------
# PUT /users/me — Update own profile (any authenticated user)
# ---------------------------------------------------------------------------

@router.put(
    "/me",
    response_model=UserResponse,
    summary="Update my profile",
)
async def update_my_profile(
    payload: UserUpdate,
    current_user: User = Depends(get_current_user),
):
    """
    Users can update their own non-sensitive profile fields.
    Role, email, and firebase_uid cannot be changed here.
    """
    updated = await UserService.update_user(
        str(current_user.id),
        payload,
    )

    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    return UserResponse.from_user(updated)


# ---------------------------------------------------------------------------
# GET /users/ — All users (Admin only)
# ---------------------------------------------------------------------------

@router.get(
    "/",
    response_model=list[UserResponse],
    summary="List all users",
)
async def get_all_users(
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    """Admin retrieves a list of all registered users."""
    users = await UserService.get_all_users()
    return [UserResponse.from_user(user) for user in users]


# ---------------------------------------------------------------------------
# GET /users/{user_id} — Get specific user (Admin only)
# ---------------------------------------------------------------------------

@router.get(
    "/{user_id}",
    response_model=UserResponse,
    summary="Get a user by ID",
)
async def get_user(
    user_id: str,
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    """Admin retrieves any user's profile by their MongoDB ID."""
    user = await UserService.get_user(user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    return UserResponse.from_user(user)


# ---------------------------------------------------------------------------
# PUT /users/{user_id}/role — Update role (Admin only)
# ---------------------------------------------------------------------------

@router.put(
    "/{user_id}/role",
    response_model=UserResponse,
    summary="Update a user's role",
)
async def update_user_role(
    user_id: str,
    payload: UserRoleUpdate,
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    """
    Admin assigns or changes a user's role.
    Promotes to OFFICER/ADMIN automatically sets is_verified=True.
    """
    user = await UserService.update_user_role(user_id, payload)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    return UserResponse.from_user(user)


# ---------------------------------------------------------------------------
# DELETE /users/{user_id} — Deactivate user (Admin only)
# ---------------------------------------------------------------------------

@router.delete(
    "/{user_id}",
    response_model=MessageResponse,
    summary="Deactivate a user account",
)
async def deactivate_user(
    user_id: str,
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    """
    Admin soft-deletes a user by setting is_active=False.
    The user's data (complaints, etc.) is preserved for audit purposes.
    Deactivated users receive HTTP 401 on next login attempt.
    """
    user = await UserService.deactivate_user(user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    return MessageResponse(message=f"User '{user.name}' has been deactivated.")
