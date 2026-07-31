"""
Complaint Routes — fully RBAC-guarded.

Permission matrix:
    POST   /complaints/                  → CITIZEN only
    GET    /complaints/                  → OFFICER, ADMIN
    GET    /complaints/my                → CITIZEN (own only)
    GET    /complaints/department        → OFFICER, ADMIN
    GET    /complaints/{id}              → CITIZEN (own), OFFICER, ADMIN
    PATCH  /complaints/{id}/status       → OFFICER, ADMIN
    PATCH  /complaints/{id}/assign       → ADMIN only
    DELETE /complaints/{id}              → ADMIN only
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from app.api.dependencies import get_current_user, require_roles
from app.enums.user import UserRole
from app.enums.complaint import ComplaintCategory, ComplaintPriority
from app.models.user import User
from app.schemas.common import MessageResponse
from app.schemas.complaint import (
    AssignOfficerRequest,
    ComplaintResponse,
    ComplaintUpdate,
    StatusUpdateRequest,
)
from app.services.complaint_service import ComplaintService
from app.services.user_service import UserService

router = APIRouter(
    prefix="/complaints",
    tags=["Complaints"],
)


# ---------------------------------------------------------------------------
# POST /complaints/ — Create complaint (Citizen only)
# ---------------------------------------------------------------------------

@router.post(
    "/",
    response_model=ComplaintResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit a new complaint with images",
)
async def create_complaint(
    title: str = Form(..., min_length=5, max_length=200),
    description: str = Form(..., min_length=10, max_length=2000),
    category: Optional[ComplaintCategory] = Form(None),
    priority: Optional[ComplaintPriority] = Form(None),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    images: List[UploadFile] = File([]),
    current_user: User = Depends(require_roles(UserRole.CITIZEN)),
):
    """
    Citizens submit a new grievance with optional image uploads.
    Accepts multipart/form-data.
    """
    complaint = await ComplaintService.create_complaint(
        title=title,
        description=description,
        citizen_id=str(current_user.id),
        category=category,
        priority=priority,
        latitude=latitude,
        longitude=longitude,
        images=images,
    )
    return ComplaintResponse.from_complaint(complaint)


# ---------------------------------------------------------------------------
# GET /complaints/my — Own complaints (Citizen only)
# NOTE: Must be defined BEFORE /{complaint_id} to avoid route shadowing.
# ---------------------------------------------------------------------------

@router.get(
    "/my",
    response_model=list[ComplaintResponse],
    summary="Get my complaints",
)
async def get_my_complaints(
    current_user: User = Depends(require_roles(UserRole.CITIZEN)),
):
    """Citizens can view only their own submitted complaints."""
    complaints = await ComplaintService.get_complaints_by_citizen(str(current_user.id))
    return [ComplaintResponse.from_complaint(complaint) for complaint in complaints]


# ---------------------------------------------------------------------------
# GET /complaints/department — Department complaints (Officer, Admin)
# ---------------------------------------------------------------------------

@router.get(
    "/department",
    response_model=list[ComplaintResponse],
    summary="Get complaints for the officer's department",
)
async def get_department_complaints(
    current_user: User = Depends(require_roles(UserRole.OFFICER, UserRole.ADMIN)),
):
    """
    Officers see complaints assigned to their department.
    Admins can use this with a query param (future: ?dept=<name>).
    """
    if not current_user.department:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Your account is not assigned to a department.",
        )
    complaints = await ComplaintService.get_complaints_by_department(current_user.department)
    return [ComplaintResponse.from_complaint(complaint) for complaint in complaints]


# ---------------------------------------------------------------------------
# GET /complaints/ — All complaints (Officer, Admin)
# ---------------------------------------------------------------------------

@router.get(
    "/",
    response_model=list[ComplaintResponse],
    summary="Get all complaints",
)
async def get_all_complaints(
    current_user: User = Depends(require_roles(UserRole.OFFICER, UserRole.ADMIN)),
):
    """Officers and admins can view all complaints in the system."""
    complaints = await ComplaintService.get_all_complaints()
    return [ComplaintResponse.from_complaint(complaint) for complaint in complaints]


# ---------------------------------------------------------------------------
# GET /complaints/{complaint_id} — Single complaint
# ---------------------------------------------------------------------------

@router.get(
    "/{complaint_id}",
    response_model=ComplaintResponse,
    summary="Get a complaint by ID",
)
async def get_complaint(
    complaint_id: str,
    current_user: User = Depends(get_current_user),
):
    """
    Accessible to all authenticated users.
    Citizens are restricted to their own complaints — returns 403 otherwise.
    Officers and Admins can view any complaint.
    """
    complaint = await ComplaintService.get_complaint(complaint_id)

    if not complaint:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found.",
        )

    # Citizens can only view their own complaints
    if (
        current_user.role == UserRole.CITIZEN
        and complaint.citizen_id != str(current_user.id)
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to perform this action.",
        )

    return ComplaintResponse.from_complaint(complaint)


# ---------------------------------------------------------------------------
# PATCH /complaints/{complaint_id}/status — Update status (Officer, Admin)
# ---------------------------------------------------------------------------

@router.patch(
    "/{complaint_id}/status",
    response_model=ComplaintResponse,
    summary="Update complaint status",
)
async def update_complaint_status(
    complaint_id: str,
    payload: StatusUpdateRequest,
    current_user: User = Depends(require_roles(UserRole.OFFICER, UserRole.ADMIN)),
):
    """
    Officers update the status of a complaint and optionally add resolution notes.
    """
    updated = await ComplaintService.update_complaint_status(
        complaint_id,
        payload,
        officer=current_user,
    )

    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found.",
        )

    return ComplaintResponse.from_complaint(updated)


# ---------------------------------------------------------------------------
# PATCH /complaints/{complaint_id}/assign — Assign officer (Admin only)
# ---------------------------------------------------------------------------

@router.patch(
    "/{complaint_id}/assign",
    response_model=ComplaintResponse,
    summary="Assign an officer to a complaint",
)
async def assign_officer(
    complaint_id: str,
    payload: AssignOfficerRequest,
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    """
    Admin assigns an officer to handle a complaint.
    Validates that the target officer exists and has the OFFICER role.
    Automatically transitions the complaint to IN_PROGRESS.
    """
    # Validate officer exists and has the right role
    officer = await UserService.get_user(payload.officer_id)
    if not officer or officer.role != UserRole.OFFICER:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid officer ID — user not found or not an officer.",
        )

    updated = await ComplaintService.assign_officer(complaint_id, payload)

    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found.",
        )

    return ComplaintResponse.from_complaint(updated)


# ---------------------------------------------------------------------------
# PATCH /complaints/{complaint_id} — Generic update (Admin only)
# ---------------------------------------------------------------------------

@router.patch(
    "/{complaint_id}",
    response_model=ComplaintResponse,
    summary="Update a complaint (Admin)",
)
async def update_complaint(
    complaint_id: str,
    payload: ComplaintUpdate,
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    """Admin can update any field on a complaint."""
    updated = await ComplaintService.update_complaint(complaint_id, payload)

    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found.",
        )

    return ComplaintResponse.from_complaint(updated)


# ---------------------------------------------------------------------------
# DELETE /complaints/{complaint_id} — Delete complaint (Admin only)
# ---------------------------------------------------------------------------

@router.delete(
    "/{complaint_id}",
    response_model=MessageResponse,
    summary="Delete a complaint",
)
async def delete_complaint(
    complaint_id: str,
    current_user: User = Depends(require_roles(UserRole.ADMIN)),
):
    """Admin permanently deletes a complaint."""
    deleted = await ComplaintService.delete_complaint(complaint_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Complaint not found.",
        )

    return MessageResponse(message="Complaint deleted successfully.")
