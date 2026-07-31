"""
StorageService — Cloudinary Storage logic for complaint images.

Responsibilities:
- Upload images to Cloudinary
- Delete complaint image folders
- Generate unique UUID filenames
- Validate image types and sizes
- Return secure URL and public_id
"""
import logging
import asyncio
import uuid
from typing import List

from fastapi import HTTPException, UploadFile, status
import cloudinary.uploader
import cloudinary.api
from cloudinary.exceptions import Error as CloudinaryError

logger = logging.getLogger(__name__)

# Config
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/jpg", "image/webp"}
REJECTED_MIME_TYPES = {"application/pdf", "application/zip", "image/svg+xml", "image/gif", "video/mp4", "application/x-msdownload"}
MAX_FILE_SIZE_MB = 5
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
MAX_IMAGES_PER_COMPLAINT = 5


class StorageService:

    @staticmethod
    async def validate_images(images: List[UploadFile]) -> None:
        """
        Validate image count, MIME types, and file sizes.
        Raises HTTP 400 if validation fails.
        """
        if not images:
            return  # No images to upload

        # 1. Validate Max Images
        if len(images) > MAX_IMAGES_PER_COMPLAINT:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Maximum {MAX_IMAGES_PER_COMPLAINT} images allowed."
            )

        for file in images:
            # 2. Validate Empty File
            if not file.filename:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Empty file provided."
                )

            # 3. Validate MIME Type
            if file.content_type in REJECTED_MIME_TYPES:
                 raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Unsupported file type: {file.content_type} is explicitly rejected."
                )
            
            if file.content_type not in ALLOWED_MIME_TYPES:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Unsupported file type. Only JPEG, PNG, and WEBP are allowed."
                )

            # 4. Validate File Size
            file.file.seek(0, 2)
            size = file.file.tell()
            file.file.seek(0)
            
            if size > MAX_FILE_SIZE_BYTES:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Image exceeds maximum size of {MAX_FILE_SIZE_MB} MB."
                )
            
            if size == 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Empty file provided."
                )

    @staticmethod
    async def upload_images(user_id: str, complaint_id: str, images: List[UploadFile]) -> List[dict]:
        """
        Uploads validated images to Cloudinary.
        Returns a list of dicts with secure URL and public_id.
        Raises HTTP 500 on storage errors.
        """
        if not images:
            return []

        logger.info("Upload started for complaint %s by user %s", complaint_id, user_id)
        uploaded_images = []

        try:
            for file in images:
                unique_filename = f"{uuid.uuid4().hex}"
                
                # Folder structure: complaints/user_id/complaint_id/
                folder_path = f"complaints/{user_id}/{complaint_id}"
                
                # Cloudinary upload is synchronous, wrap in asyncio.to_thread to avoid blocking
                upload_result = await asyncio.to_thread(
                    cloudinary.uploader.upload,
                    file.file,
                    folder=folder_path,
                    public_id=unique_filename,
                    resource_type="image",
                    overwrite=False,
                    use_filename=False,
                    unique_filename=False,
                )

                secure_url = upload_result.get("secure_url")
                public_id = upload_result.get("public_id")
                if not secure_url or not public_id:
                    raise RuntimeError("Cloudinary returned no secure URL or public ID.")

                uploaded_images.append({
                    "url": secure_url,
                    "public_id": public_id,
                })
                logger.info("Uploaded Cloudinary asset %s for complaint %s", public_id, complaint_id)
            
            logger.info("Upload completed for complaint %s (%d files)", complaint_id, len(uploaded_images))
            return uploaded_images

        except CloudinaryError:
            logger.exception("Cloudinary upload failed for complaint %s", complaint_id)
            if uploaded_images:
                await asyncio.to_thread(StorageService.delete_complaint_folder, user_id, complaint_id)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to upload images to Cloudinary. Please try again later."
            )
        except Exception:
            logger.exception("Unexpected upload failure for complaint %s", complaint_id)
            if uploaded_images:
                await asyncio.to_thread(StorageService.delete_complaint_folder, user_id, complaint_id)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="An unexpected error occurred during image upload."
            )

    @staticmethod
    def delete_complaint_folder(user_id: str, complaint_id: str) -> None:
        """
        Deletes all images in a specific complaint's folder from Cloudinary, then deletes the folder itself.
        """
        logger.info("Deletion started for complaint folder %s", complaint_id)
        prefix = f"complaints/{user_id}/{complaint_id}"

        try:
            # 1. Delete all resources in the folder
            cloudinary.api.delete_resources_by_prefix(prefix, resource_type="image")
            
            # 2. Delete the empty folder itself
            cloudinary.api.delete_folder(prefix)
            
            logger.info("Deletion completed for complaint %s folder", complaint_id)
            
        except CloudinaryError as e:
            logger.error("Cloudinary deletion failed for complaint %s: %s", complaint_id, str(e))
        except Exception as e:
            logger.error("Unexpected deletion failure for complaint %s: %s", complaint_id, str(e))
