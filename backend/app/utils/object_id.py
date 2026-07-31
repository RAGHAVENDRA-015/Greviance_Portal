from beanie import PydanticObjectId
from fastapi import HTTPException, status


def validate_object_id(id: str) -> PydanticObjectId:
    """
    Parse a string into a Beanie PydanticObjectId.
    Raises HTTP 400 with a clear message if the format is invalid.
    Used to validate both user_id and complaint_id path params.
    """
    try:
        return PydanticObjectId(id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid ID format — must be a 24-character hex string.",
        )