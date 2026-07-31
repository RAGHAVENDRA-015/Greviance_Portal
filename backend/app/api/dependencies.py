"""Firebase authentication and role-based authorization dependencies."""

from typing import Callable

from fastapi import Depends, Header, HTTPException, status
from firebase_admin import auth as firebase_auth

from app.enums.user import UserRole
from app.models.user import User
from app.services.user_service import UserService


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


async def verify_firebase_token(
    authorization: str | None = Header(None, description="Firebase JWT in Bearer format"),
) -> dict:
    """Verify a Firebase ID token supplied in ``Authorization: Bearer ...``."""
    if not authorization:
        raise _unauthorized("Authentication is required.")

    scheme, _, raw_token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not raw_token.strip():
        raise _unauthorized("Invalid Firebase token.")

    try:
        return firebase_auth.verify_id_token(raw_token.strip(), check_revoked=True)
    except (firebase_auth.RevokedIdTokenError, firebase_auth.ExpiredIdTokenError):
        raise _unauthorized("Your session has expired. Please sign in again.")
    except Exception:
        # Do not expose token parsing or Firebase Admin implementation details.
        raise _unauthorized("Invalid Firebase token.")


async def get_current_user(
    firebase_payload: dict = Depends(verify_firebase_token),
) -> User:
    """Resolve the verified Firebase identity to the authoritative MongoDB user."""
    if not firebase_payload.get("uid") or not firebase_payload.get("email"):
        raise _unauthorized("This Firebase account does not provide a verified email address.")

    user = await UserService.get_or_create_user(firebase_payload)
    if not user.is_active:
        raise _unauthorized("Your account has been deactivated. Contact an administrator.")
    return user


def require_roles(*roles: UserRole) -> Callable:
    """Return a dependency that permits only users holding one of ``roles``."""
    allowed = set(roles)

    async def _role_guard(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action.",
            )
        return current_user

    return _role_guard
