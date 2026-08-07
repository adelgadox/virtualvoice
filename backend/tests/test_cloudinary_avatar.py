"""
Tests for mirroring Instagram avatars into Cloudinary.

The service sits on the OAuth connect path, so its failure behaviour matters as
much as its happy path: a Cloudinary problem must never stop an influencer from
connecting their Instagram account.
"""
from unittest.mock import patch

import pytest

from app.services import cloudinary_avatar
from app.services.cloudinary_avatar import AVATAR_FOLDER, is_configured, upload_avatar

META_URL = "https://scontent-mad1-1.cdninstagram.com/v/t51.2885-19/profile.jpg"
CLOUDINARY_URL = (
    "https://res.cloudinary.com/demo/image/upload/v1782794310/"
    "virtualvoice/avatars/17841400000000000.webp"
)
ACCOUNT_ID = "17841400000000000"


@pytest.fixture
def configured(monkeypatch):
    """All three credentials present."""
    monkeypatch.setattr(cloudinary_avatar.settings, "cloudinary_cloud_name", "demo")
    monkeypatch.setattr(cloudinary_avatar.settings, "cloudinary_api_key", "key")
    monkeypatch.setattr(cloudinary_avatar.settings, "cloudinary_api_secret", "secret")


@pytest.fixture
def unconfigured(monkeypatch):
    monkeypatch.setattr(cloudinary_avatar.settings, "cloudinary_cloud_name", "")
    monkeypatch.setattr(cloudinary_avatar.settings, "cloudinary_api_key", "")
    monkeypatch.setattr(cloudinary_avatar.settings, "cloudinary_api_secret", "")


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

def test_is_configured_requires_all_three_credentials(monkeypatch, configured):
    assert is_configured() is True

    monkeypatch.setattr(cloudinary_avatar.settings, "cloudinary_api_secret", "")
    assert is_configured() is False


def test_not_configured_when_nothing_is_set(unconfigured):
    assert is_configured() is False


# ---------------------------------------------------------------------------
# Upload
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_returns_the_cloudinary_url(configured):
    with patch("cloudinary.uploader.upload", return_value={"secure_url": CLOUDINARY_URL}):
        assert await upload_avatar(META_URL, ACCOUNT_ID) == CLOUDINARY_URL


@pytest.mark.asyncio
async def test_stores_under_the_virtualvoice_folder(configured):
    with patch("cloudinary.uploader.upload", return_value={"secure_url": CLOUDINARY_URL}) as up:
        await upload_avatar(META_URL, ACCOUNT_ID)

    assert up.call_args.kwargs["folder"] == AVATAR_FOLDER
    assert AVATAR_FOLDER.startswith("virtualvoice/")


@pytest.mark.asyncio
async def test_keys_the_asset_on_the_account_id(configured):
    """Reconnecting the same account must overwrite, not accumulate copies."""
    with patch("cloudinary.uploader.upload", return_value={"secure_url": CLOUDINARY_URL}) as up:
        await upload_avatar(META_URL, ACCOUNT_ID)

    assert up.call_args.kwargs["public_id"] == ACCOUNT_ID
    assert up.call_args.kwargs["overwrite"] is True
    assert up.call_args.kwargs["invalidate"] is True


@pytest.mark.asyncio
async def test_passes_the_meta_url_for_cloudinary_to_pull(configured):
    with patch("cloudinary.uploader.upload", return_value={"secure_url": CLOUDINARY_URL}) as up:
        await upload_avatar(META_URL, ACCOUNT_ID)

    assert up.call_args.args[0] == META_URL


@pytest.mark.asyncio
async def test_normalizes_to_a_square_webp(configured):
    with patch("cloudinary.uploader.upload", return_value={"secure_url": CLOUDINARY_URL}) as up:
        await upload_avatar(META_URL, ACCOUNT_ID)

    kwargs = up.call_args.kwargs
    assert kwargs["format"] == "webp"
    transformation = kwargs["transformation"][0]
    assert transformation["width"] == transformation["height"]
    assert transformation["crop"] == "fill"


# ---------------------------------------------------------------------------
# Degradation — none of these may raise
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_returns_none_for_a_missing_source(configured):
    with patch("cloudinary.uploader.upload") as up:
        assert await upload_avatar(None, ACCOUNT_ID) is None

    up.assert_not_called()


@pytest.mark.asyncio
async def test_keeps_the_meta_url_when_cloudinary_is_not_configured(unconfigured):
    with patch("cloudinary.uploader.upload") as up:
        assert await upload_avatar(META_URL, ACCOUNT_ID) == META_URL

    up.assert_not_called()


@pytest.mark.asyncio
async def test_falls_back_to_the_meta_url_when_the_upload_raises(configured):
    with patch("cloudinary.uploader.upload", side_effect=RuntimeError("Cloudinary down")):
        assert await upload_avatar(META_URL, ACCOUNT_ID) == META_URL


@pytest.mark.asyncio
async def test_falls_back_when_the_response_has_no_secure_url(configured):
    with patch("cloudinary.uploader.upload", return_value={}):
        assert await upload_avatar(META_URL, ACCOUNT_ID) == META_URL
