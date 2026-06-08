import logging
import asyncio
from app.config.settings import settings

logger = logging.getLogger(__name__)

_cloudinary_configured = False


def _configure():
    global _cloudinary_configured
    if not _cloudinary_configured and settings.CLOUDINARY_CLOUD_NAME:
        try:
            import cloudinary
            cloudinary.config(
                cloud_name=settings.CLOUDINARY_CLOUD_NAME,
                api_key=settings.CLOUDINARY_API_KEY,
                api_secret=settings.CLOUDINARY_API_SECRET,
                secure=True,
            )
            _cloudinary_configured = True
        except ImportError:
            logger.warning("cloudinary package not installed")


async def upload_to_cloudinary(
    data: bytes,
    folder: str = "vihara",
    public_id: str = None,
) -> str:
    """Upload image bytes to Cloudinary and return secure URL."""
    _configure()

    if not _cloudinary_configured:
        raise RuntimeError("Cloudinary not configured")

    import cloudinary.uploader
    import io

    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(
        None,
        lambda: cloudinary.uploader.upload(
            io.BytesIO(data),
            folder=f"vihara/{folder}",
            public_id=public_id,
            resource_type="image",
            quality="auto:good",
            fetch_format="auto",
        ),
    )
    return result["secure_url"]


async def delete_from_cloudinary(public_id: str) -> bool:
    """Delete an asset from Cloudinary."""
    _configure()
    if not _cloudinary_configured:
        return False

    import cloudinary.uploader

    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(
        None,
        lambda: cloudinary.uploader.destroy(public_id),
    )
    return result.get("result") == "ok"
