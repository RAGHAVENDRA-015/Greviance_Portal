from fastapi import APIRouter, Depends

from app.api.dependencies import get_current_user
from app.models.user import User
from app.schemas.user import UserResponse

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"],
)


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current authenticated user",
    description=(
        "Returns the MongoDB User object for the authenticated Firebase user. "
        "Auto-creates a Citizen account if this is the user's first login."
    ),
)
async def get_me(
    current_user: User = Depends(get_current_user),
):
    return UserResponse.from_user(current_user)
