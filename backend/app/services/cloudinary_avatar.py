"""
Mirror Instagram profile pictures into Cloudinary.

Meta serves profile pictures from signed, short-lived URLs on
scontent-*.cdninstagram.com. Storing those URLs directly means the avatar
breaks once the signature expires, and the frontend CSP does not allow Meta's
CDNs anyway. Copying the image into Cloudinary solves both: the URL is stable
and it is served from an origin the CSP already trusts.

Everything lands under the "virtualvoice" folder so this project's assets stay
separate from the other projects sharing the Cloudinary account.
"""
import asyncio
import logging

import cloudinary
import cloudinary.uploader

from app.config import settings

logger = logging.getLogger(__name__)

# Top-level folder for this project inside the shared Cloudinary account.
AVATAR_FOLDER = "virtualvoice/avatars"

# Avatars render at 40px; 160 covers up to 4x without storing anything larger.
AVATAR_STORED_SIZE_PX = 160


def is_configured() -> bool:
    """True when all three Cloudinary credentials are present."""
    return bool(
        settings.cloudinary_cloud_name
        and settings.cloudinary_api_key
        and settings.cloudinary_api_secret
    )


def _configure() -> None:
    cloudinary.config(
        cloud_name=settings.cloudinary_cloud_name,
        api_key=settings.cloudinary_api_key,
        api_secret=settings.cloudinary_api_secret,
        secure=True,
    )


async def upload_avatar(source_url: str | None, account_id: str) -> str | None:
    """
    Copy a remote profile picture into virtualvoice/avatars and return its
    Cloudinary URL.

    `account_id` becomes the public_id, so re-connecting the same Instagram
    account overwrites its avatar instead of piling up orphaned copies.

    Returns the original URL when Cloudinary is not configured, and on any
    upload failure — connecting a social account must not break because the
    avatar could not be mirrored.
    """
    if not source_url:
        return None

    if not is_configured():
        logger.warning(
            "Cloudinary is not configured — keeping the Meta CDN URL for account %s. "
            "The frontend CSP will block it.",
            account_id,
        )
        return source_url

    _configure()

    try:
        result = await asyncio.to_thread(
            cloudinary.uploader.upload,
            source_url,
            public_id=account_id,
            folder=AVATAR_FOLDER,
            overwrite=True,
            invalidate=True,
            format="webp",
            transformation=[
                {
                    "width": AVATAR_STORED_SIZE_PX,
                    "height": AVATAR_STORED_SIZE_PX,
                    "crop": "fill",
                    "gravity": "face",
                }
            ],
            context={"app": "virtualvoice", "account_id": account_id},
        )
    except Exception as exc:
        logger.warning(
            "Could not mirror the avatar for account %s into Cloudinary: %s",
            account_id,
            exc,
        )
        return source_url

    return result.get("secure_url") or source_url
