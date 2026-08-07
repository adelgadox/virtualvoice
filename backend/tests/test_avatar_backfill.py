"""
Tests for the avatar backfill.

The script touches production rows, so the cases that matter most are the ones
where it must NOT write: already-migrated accounts, dry runs, and failed
uploads.
"""
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.avatar_backfill import (
    BackfillReport,
    backfill_account,
    needs_backfill,
    run_backfill,
)

META_URL = "https://scontent-mad1-1.cdninstagram.com/v/t51.2885-19/profile.jpg"
CLOUDINARY_URL = (
    "https://res.cloudinary.com/demo/image/upload/v1782794310/"
    "virtualvoice/avatars/17841400000000000.webp"
)


def make_account(**overrides):
    """A stand-in for a SocialAccount row — the service only reads attributes."""
    defaults = {
        "account_id": "17841400000000000",
        "profile_picture_url": META_URL,
        "access_token": "encrypted-token",
        "platform": "instagram",
        "is_active": True,
    }
    return SimpleNamespace(**{**defaults, **overrides})


# ---------------------------------------------------------------------------
# Selection
# ---------------------------------------------------------------------------

class TestNeedsBackfill:
    def test_meta_url_needs_backfill(self):
        assert needs_backfill(make_account()) is True

    def test_cloudinary_url_does_not(self):
        assert needs_backfill(make_account(profile_picture_url=CLOUDINARY_URL)) is False

    def test_missing_url_does_not(self):
        assert needs_backfill(make_account(profile_picture_url=None)) is False


# ---------------------------------------------------------------------------
# Per-account outcomes
# ---------------------------------------------------------------------------

class TestBackfillAccount:
    @pytest.mark.asyncio
    async def test_refreshes_from_graph_before_uploading(self):
        """The stored URL is expired by now, so it must not be reused."""
        account = make_account()

        with patch("app.services.avatar_backfill.decrypt_token", return_value="page-token"), \
             patch("app.services.avatar_backfill.get_profile_picture_url",
                   new=AsyncMock(return_value="https://scontent-fresh.cdninstagram.com/new.jpg")) as graph, \
             patch("app.services.avatar_backfill.upload_avatar",
                   new=AsyncMock(return_value=CLOUDINARY_URL)) as upload:
            outcome = await backfill_account(account, dry_run=False)

        assert outcome == "migrated"
        graph.assert_awaited_once_with("17841400000000000", "page-token")
        assert upload.await_args.args[0] == "https://scontent-fresh.cdninstagram.com/new.jpg"
        assert account.profile_picture_url == CLOUDINARY_URL

    @pytest.mark.asyncio
    async def test_dry_run_does_not_upload_or_mutate(self):
        account = make_account()

        with patch("app.services.avatar_backfill.decrypt_token", return_value="page-token"), \
             patch("app.services.avatar_backfill.get_profile_picture_url",
                   new=AsyncMock(return_value=META_URL)), \
             patch("app.services.avatar_backfill.upload_avatar", new=AsyncMock()) as upload:
            outcome = await backfill_account(account, dry_run=True)

        assert outcome == "migrated"
        upload.assert_not_awaited()
        assert account.profile_picture_url == META_URL

    @pytest.mark.asyncio
    async def test_skips_an_account_with_no_token(self):
        account = make_account(access_token=None)

        with patch("app.services.avatar_backfill.get_profile_picture_url", new=AsyncMock()) as graph:
            outcome = await backfill_account(account, dry_run=False)

        assert outcome == "skipped_no_token"
        graph.assert_not_awaited()

    @pytest.mark.asyncio
    async def test_skips_when_the_token_cannot_be_decrypted(self):
        account = make_account()

        with patch("app.services.avatar_backfill.decrypt_token", side_effect=ValueError("bad key")):
            outcome = await backfill_account(account, dry_run=False)

        assert outcome == "skipped_no_token"

    @pytest.mark.asyncio
    async def test_skips_when_graph_returns_no_picture(self):
        """An expired page token lands here — leave the row alone."""
        account = make_account()

        with patch("app.services.avatar_backfill.decrypt_token", return_value="page-token"), \
             patch("app.services.avatar_backfill.get_profile_picture_url", new=AsyncMock(return_value=None)):
            outcome = await backfill_account(account, dry_run=False)

        assert outcome == "skipped_no_picture"
        assert account.profile_picture_url == META_URL

    @pytest.mark.asyncio
    async def test_does_not_write_back_when_the_upload_falls_through(self):
        """upload_avatar returns its input on failure — that must not be stored."""
        account = make_account()

        with patch("app.services.avatar_backfill.decrypt_token", return_value="page-token"), \
             patch("app.services.avatar_backfill.get_profile_picture_url", new=AsyncMock(return_value=META_URL)), \
             patch("app.services.avatar_backfill.upload_avatar", new=AsyncMock(return_value=META_URL)):
            outcome = await backfill_account(account, dry_run=False)

        assert outcome == "failed_upload"
        assert account.profile_picture_url == META_URL


# ---------------------------------------------------------------------------
# Run
# ---------------------------------------------------------------------------

class TestRunBackfill:
    @pytest.mark.asyncio
    async def test_refuses_to_run_without_cloudinary_configured(self):
        with patch("app.services.avatar_backfill.is_configured", return_value=False):
            with pytest.raises(RuntimeError, match="CLOUDINARY_CLOUD_NAME"):
                await run_backfill(MagicMock())

    @pytest.mark.asyncio
    async def test_commits_once_after_migrating(self):
        db = MagicMock()

        with patch("app.services.avatar_backfill.is_configured", return_value=True), \
             patch("app.services.avatar_backfill.find_pending", return_value=[make_account(), make_account()]), \
             patch("app.services.avatar_backfill.backfill_account", new=AsyncMock(return_value="migrated")):
            report = await run_backfill(db)

        assert report.scanned == 2
        assert report.migrated == 2
        db.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_does_not_commit_on_a_dry_run(self):
        db = MagicMock()

        with patch("app.services.avatar_backfill.is_configured", return_value=True), \
             patch("app.services.avatar_backfill.find_pending", return_value=[make_account()]), \
             patch("app.services.avatar_backfill.backfill_account", new=AsyncMock(return_value="migrated")):
            await run_backfill(db, dry_run=True)

        db.commit.assert_not_called()

    @pytest.mark.asyncio
    async def test_does_not_commit_when_nothing_migrated(self):
        db = MagicMock()

        with patch("app.services.avatar_backfill.is_configured", return_value=True), \
             patch("app.services.avatar_backfill.find_pending", return_value=[make_account()]), \
             patch("app.services.avatar_backfill.backfill_account", new=AsyncMock(return_value="failed_upload")):
            report = await run_backfill(db)

        assert report.failed_upload == 1
        db.commit.assert_not_called()

    @pytest.mark.asyncio
    async def test_tallies_mixed_outcomes(self):
        db = MagicMock()
        outcomes = ["migrated", "skipped_no_token", "failed_upload", "migrated"]

        with patch("app.services.avatar_backfill.is_configured", return_value=True), \
             patch("app.services.avatar_backfill.find_pending", return_value=[make_account() for _ in outcomes]), \
             patch("app.services.avatar_backfill.backfill_account", new=AsyncMock(side_effect=outcomes)):
            report = await run_backfill(db)

        assert report == BackfillReport(
            scanned=4, migrated=2, skipped_no_token=1, failed_upload=1
        )
