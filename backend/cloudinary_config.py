import os
import cloudinary
import cloudinary.uploader

cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
)

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}


def upload_image(file) -> str | None:
    """Upload an image file to Cloudinary and return the secure URL."""
    result = cloudinary.uploader.upload(
        file.file,
        folder="smartaid_problems",
        resource_type="image",
    )
    return result.get("secure_url")
