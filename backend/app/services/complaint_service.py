"""
ComplaintService — business logic for grievance management.

All methods are static to keep the service stateless.
Role enforcement (who can call what) happens at the route/dependency layer.
"""
import logging
import asyncio
from typing import List, Optional, Sequence

from beanie import PydanticObjectId
from fastapi import HTTPException, UploadFile, status

from app.enums.complaint import ComplaintStatus, ComplaintCategory, ComplaintPriority
from app.enums.user import UserRole
from app.models.complaint import Complaint
from app.models.user import User
from app.schemas.complaint import (
    AssignOfficerRequest,
    ComplaintUpdate,
    StatusUpdateRequest,
)
from app.services.ai_service import AIService
from app.services.storage_service import StorageService
from app.utils.object_id import validate_object_id

logger = logging.getLogger(__name__)


class ComplaintService:

    # ------------------------------------------------------------------
    # Create
    # ------------------------------------------------------------------

    @staticmethod
    async def create_complaint(
        title: str,
        description: str,
        citizen_id: str,
        category: Optional[ComplaintCategory] = None,
        priority: Optional[ComplaintPriority] = None,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        images: Sequence[UploadFile] | None = None,
    ) -> Complaint:
        """
        Create and immediately persist a new complaint to MongoDB.
        
        Flow: Validate User -> Validate Images -> Upload Images -> Gemini AI -> Create Complaint -> Save MongoDB
        """
        # The route supplies the current Mongo user id. Validate it here too so
        # direct/internal callers cannot persist malformed ownership data.
        citizen_id = str(validate_object_id(citizen_id))
        normalized_images = list(images or [])
        title = title.strip()
        description = description.strip()

        if not 5 <= len(title) <= 200:
            raise HTTPException(status_code=422, detail="Title must be between 5 and 200 characters.")
        if not 10 <= len(description) <= 2000:
            raise HTTPException(status_code=422, detail="Description must be between 10 and 2000 characters.")

        if (latitude is None) != (longitude is None):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Latitude and longitude must be supplied together.",
            )
        if latitude is not None and not -90 <= latitude <= 90:
            raise HTTPException(status_code=422, detail="Latitude must be between -90 and 90.")
        if longitude is not None and not -180 <= longitude <= 180:
            raise HTTPException(status_code=422, detail="Longitude must be between -180 and 180.")

        # Generate the Mongo id first so image storage has a stable folder.
        complaint_id = PydanticObjectId()
        str_complaint_id = str(complaint_id)
        uploaded_images: list[dict] = []

        try:
            logger.info("Creating complaint %s for user %s", str_complaint_id, citizen_id)
            if normalized_images:
                await StorageService.validate_images(normalized_images)
                uploaded_images = await StorageService.upload_images(
                    citizen_id, str_complaint_id, normalized_images
                )

            ai_result = await AIService.classify_complaint(title, description)
            location = None
            if latitude is not None and longitude is not None:
                location = {"latitude": latitude, "longitude": longitude}

            complaint = Complaint(
                id=complaint_id,
                title=title,
                description=description,
                citizen_id=citizen_id,
                category=ai_result.category if ai_result else category,
                priority=ai_result.priority if ai_result else priority,
                department=ai_result.department if ai_result else None,
                ai_summary=ai_result.summary if ai_result else None,
                ai_confidence=ai_result.confidence if ai_result else None,
                location=location,
                images=uploaded_images,
            )

            await complaint.insert()
            logger.info("Created complaint %s for user %s", complaint.id, citizen_id)
            return complaint

        except HTTPException:
            if uploaded_images:
                await asyncio.to_thread(
                    StorageService.delete_complaint_folder, citizen_id, str_complaint_id
                )
            raise
        except Exception:
            logger.exception("Complaint creation failed for %s (user %s)", str_complaint_id, citizen_id)
            if uploaded_images:
                logger.warning("Rolling back Cloudinary assets for complaint %s", str_complaint_id)
                await asyncio.to_thread(
                    StorageService.delete_complaint_folder, citizen_id, str_complaint_id
                )
            raise

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    @staticmethod
    async def get_all_complaints() -> List[Complaint]:
        """Return all complaints — Admin/Officer only (enforced at route level)."""
        return await Complaint.find_all().sort(-Complaint.created_at).to_list()

    @staticmethod
    async def get_complaint(complaint_id: str) -> Optional[Complaint]:
        """Fetch a single complaint by its MongoDB ObjectId."""
        object_id = validate_object_id(complaint_id)
        return await Complaint.get(object_id)

    @staticmethod
    async def get_complaints_by_citizen(citizen_id: str) -> List[Complaint]:
        """Return all complaints submitted by a specific citizen."""
        return await Complaint.find(Complaint.citizen_id == citizen_id).sort(-Complaint.created_at).to_list()

    @staticmethod
    async def get_recent_complaints_by_citizen(citizen_id: str, limit: int = 10) -> List[Complaint]:
        """
        Return the most recent N complaints for a citizen with a DB-level limit.

        OPTIMIZATION (Phase 9): Uses .limit() on the MongoDB query instead of fetching
        all documents and slicing in Python — avoids loading unbounded document sets.
        """
        return (
            await Complaint.find(Complaint.citizen_id == citizen_id)
            .sort(-Complaint.created_at)
            .limit(limit)
            .to_list()
        )

    @staticmethod
    async def get_complaints_by_department(department: str) -> List[Complaint]:
        """Return all complaints assigned to a specific department — Officer view."""
        return await Complaint.find(Complaint.department == department).sort(-Complaint.created_at).to_list()

    @staticmethod
    async def get_complaints_by_officer(officer_id: str) -> List[Complaint]:
        """Return all complaints assigned to a specific officer."""
        return await Complaint.find(Complaint.assigned_officer == officer_id).sort(-Complaint.created_at).to_list()

    # ------------------------------------------------------------------
    # Update — citizen/admin generic
    # ------------------------------------------------------------------

    @staticmethod
    async def update_complaint(
        complaint_id: str,
        complaint_data: ComplaintUpdate,
    ) -> Optional[Complaint]:
        """
        Generic update — used by admin for broad field updates.
        Citizen/officer-specific updates use dedicated methods below.
        """
        object_id = validate_object_id(complaint_id)
        complaint = await Complaint.get(object_id)

        if not complaint:
            return None

        update_data = complaint_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(complaint, key, value)

        await complaint.save()
        return complaint

    # ------------------------------------------------------------------
    # Update — officer
    # ------------------------------------------------------------------

    @staticmethod
    async def update_complaint_status(
        complaint_id: str,
        status_data: StatusUpdateRequest,
        officer: User,
    ) -> Optional[Complaint]:
        """
        Officer-specific: update complaint status and optionally add resolution notes.

        Ownership rule (for OFFICER role only — ADMINs bypass):
            - Officer must be directly assigned to the complaint, OR
            - Officer's department must match the complaint's department.
        Admins have no such restriction.
        """
        object_id = validate_object_id(complaint_id)
        complaint = await Complaint.get(object_id)

        if not complaint:
            return None

        # Enforce department/assignment ownership for officers
        if officer.role == UserRole.OFFICER:
            assigned_to_officer = complaint.assigned_officer == str(officer.id)
            in_same_dept = (
                officer.department is not None
                and officer.department == complaint.department
            )
            if not (assigned_to_officer or in_same_dept):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=(
                        "You can only update complaints assigned to you "
                        "or your department."
                    ),
                )

        complaint.status = status_data.status

        if status_data.resolution_notes:
            complaint.resolution_notes = status_data.resolution_notes

        await complaint.save()
        return complaint

    # ------------------------------------------------------------------
    # Update — admin
    # ------------------------------------------------------------------

    @staticmethod
    async def assign_officer(
        complaint_id: str,
        assign_data: AssignOfficerRequest,
    ) -> Optional[Complaint]:
        """
        Admin-only: assign an officer and optionally a department to a complaint.
        Validates that the officer_id maps to a real user at the route level.
        """
        object_id = validate_object_id(complaint_id)
        complaint = await Complaint.get(object_id)

        if not complaint:
            return None

        complaint.assigned_officer = assign_data.officer_id

        if assign_data.department:
            complaint.department = assign_data.department

        # Automatically move to IN_PROGRESS when an officer is assigned
        if complaint.status == ComplaintStatus.PENDING:
            complaint.status = ComplaintStatus.IN_PROGRESS

        await complaint.save()
        return complaint

    # ------------------------------------------------------------------
    # Delete — admin
    # ------------------------------------------------------------------

    @staticmethod
    async def delete_complaint(complaint_id: str) -> bool:
        """
        Admin-only: hard delete a complaint.
        Deletes the storage folder first, then deletes from MongoDB.
        Returns True if deleted, False if not found.
        """
        object_id = validate_object_id(complaint_id)
        complaint = await Complaint.get(object_id)

        if not complaint:
            return False

        # Cleanup Firebase Storage
        StorageService.delete_complaint_folder(complaint.citizen_id, str(complaint.id))

        await complaint.delete()
        return True

    # ------------------------------------------------------------------
    # Analytics — admin dashboard
    # ------------------------------------------------------------------

    @staticmethod
    async def get_dashboard_stats() -> dict:
        """
        Aggregate complaint statistics for the admin dashboard.

        Uses MongoDB aggregation pipeline instead of loading all documents
        into Python memory — scales correctly at thousands of complaints.
        """
        pipeline = [
            {
                "$group": {
                    "_id": "$status",
                    "count": {"$sum": 1},
                    "departments": {"$push": "$department"},
                }
            }
        ]

        try:
            results = await Complaint.aggregate(pipeline).to_list()
        except Exception:
            logger.exception("Complaint dashboard aggregation failed")
            raise

        by_status = {
            "pending": 0,
            "in_progress": 0,
            "resolved": 0,
            "rejected": 0,
        }
        by_department: dict[str, int] = {}

        for group in results:
            raw_status = (group.get("_id") or "").lower().replace(" ", "_")
            if raw_status in by_status:
                by_status[raw_status] = group["count"]

            for dept in group.get("departments", []):
                label = dept or "Unassigned"
                by_department[label] = by_department.get(label, 0) + 1

        total = sum(by_status.values())

        return {
            "total_complaints": total,
            **by_status,
            "by_department": by_department,
        }
