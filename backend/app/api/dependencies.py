import logging
from typing import Callable, Optional

from fastapi import Depends, Header, HTTPException, status
from firebase_admin import auth as firebase_auth

from app.enums.user import UserRole
from app.models.user import User
from app.services.user_service import UserService

logger = logging.getLogger(__name__)


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


async def verify_firebase_token(
    authorization: Optional[str] = Header(None),
) -> dict:
    if not authorization:
        raise _unauthorized("Authentication is required.")

    scheme, _, raw_token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not raw_token.strip():
        raise _unauthorized("Invalid authorization header format. Expected 'Bearer <token>'.")

    try:
        decoded = firebase_auth.verify_id_token(
            raw_token.strip(),
            check_revoked=True,
        )
        return decoded
    except Exception as exc:
        logger.warning("Firebase token verification failed: %s (%s)", type(exc).__name__, exc)
        raise _unauthorized(f"Firebase verification failed: {type(exc).__name__}")





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


async def get_optional_current_user(
    authorization: str | None = Header(None),
) -> User | None:
    """Resolve current user if valid Firebase token present, otherwise return None."""
    if not authorization:
        return None
    try:
        payload = await verify_firebase_token(authorization)
        if payload and payload.get("uid") and payload.get("email"):
            user = await UserService.get_or_create_user(payload)
            if user.is_active:
                return user
    except Exception:
        pass
    return None


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
