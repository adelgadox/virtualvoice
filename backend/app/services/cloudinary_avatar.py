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

# Marks a URL as already mirrored.
CLOUDINARY_HOST = "res.cloudinary.com"

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


async def sync_avatar_in_background(account_id: str, source_url: str | None) -> None:
    """
    Mirror an avatar and persist the result, outside any request.

    Runs as a FastAPI background task after the OAuth callback has already
    redirected, so the user never waits on Cloudinary. That means the request's
    session is gone by now and this opens its own.

    Never raises: a background task that blows up takes its traceback to the
    logs and nothing else, and the row it would have updated is already valid —
    it just still holds the Meta URL.
    """
    if not source_url:
        return

    try:
        mirrored = await upload_avatar(source_url, account_id)
    except Exception as exc:  # pragma: no cover — upload_avatar swallows its own
        logger.warning("Avatar sync failed for account %s: %s", account_id, exc)
        return

    # upload_avatar returns its input when it could not copy the image.
    if not mirrored or CLOUDINARY_HOST not in mirrored:
        return

    # Imported here so the module keeps working in contexts with no database.
    from app.database import SessionLocal
    from app.models.social_account import SocialAccount

    db = SessionLocal()
    try:
        # Scoped by account_id alone, not by influencer: it is the same
        # Instagram account and therefore the same picture wherever it appears.
        rows = (
            db.query(SocialAccount)
            .filter(SocialAccount.account_id == account_id)
            .all()
        )
        for row in rows:
            row.profile_picture_url = mirrored
        db.commit()
        logger.info("Mirrored the avatar for account %s (%d row(s))", account_id, len(rows))
    except Exception as exc:
        db.rollback()
        logger.warning("Could not store the mirrored avatar for account %s: %s", account_id, exc)
    finally:
        db.close()
