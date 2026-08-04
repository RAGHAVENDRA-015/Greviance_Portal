"""
Admin Routes — exclusively for ADMIN role.

All endpoints in this router require UserRole.ADMIN — enforced at the
router-level via the dependency defined on each route.

Endpoints:
    GET  /admin/dashboard   → System-wide analytics
    GET  /admin/officers    → List all officers (for assignment UI)
    GET  /admin/users       → Users filtered by role (query param)
"""
from typing import Optional

from fastapi import APIRouter, Depends, Query, status

from app.api.dependencies import require_roles
from app.enums.user import UserRole
from app.models.user import User
from app.schemas.common import DashboardStats
from app.schemas.user import UserResponse
from app.services.complaint_service import ComplaintService
from app.services.user_service import UserService

router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
)


# ---------------------------------------------------------------------------
# GET /admin/dashboard — Analytics summary
# ---------------------------------------------------------------------------

@router.get(
    "/dashboard",
    response_model=DashboardStats,
    summary="Admin analytics dashboard",
    description="Returns complaint counts by status, department breakdown, and user counts.",
)
async def get_dashboard(
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    """
    Aggregates complaint statistics for the admin dashboard.
    Also returns total user and officer counts.
    """
    stats = await ComplaintService.get_dashboard_stats()

    all_users = await UserService.get_all_users()
    officers = await UserService.get_users_by_role(UserRole.OFFICER)

    return {
        **stats,
        "total_users": len(all_users),
        "total_officers": len(officers),
    }


# ---------------------------------------------------------------------------
# GET /admin/officers — List all officers (for assignment dropdown)
# ---------------------------------------------------------------------------

@router.get(
    "/officers",
    response_model=list[UserResponse],
    summary="List all officers",
    description="Returns all active, verified officers — used to populate assignment dropdowns.",
)
async def get_all_officers(
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    """Admin retrieves all officers available for complaint assignment."""
    officers = await UserService.get_active_officers()
    return [UserResponse.from_user(officer) for officer in officers]


# ---------------------------------------------------------------------------
# GET /admin/users/by-role — Users filtered by role
# ---------------------------------------------------------------------------

@router.get(
    "/users/by-role",
    response_model=list[UserResponse],
    summary="Get users filtered by role",
)
async def get_users_by_role(
    role: UserRole = Query(..., description="Filter users by role"),
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    """Admin retrieves all users with a specific role."""
    users = await UserService.get_users_by_role(role)
    return [UserResponse.from_user(user) for user in users]
