"""
Cloudinary Configuration
"""
import cloudinary
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

def initialize_cloudinary():
    """
    Configure Cloudinary exactly once using settings from the environment.
    """
    cloudinary.config(
        cloud_name=settings.CLOUDINARY_CLOUD_NAME,
        api_key=settings.CLOUDINARY_API_KEY,
        api_secret=settings.CLOUDINARY_API_SECRET,
        secure=True,
    )
    logger.info("Cloudinary configured for cloud %s", settings.CLOUDINARY_CLOUD_NAME)
