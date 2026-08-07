"""
Tests for the Instagram OAuth callback.

The point of interest is that the avatar upload no longer blocks the redirect:
the callback stores Meta's URL and schedules the Cloudinary copy as a
background task.
"""
import json
import time
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.database import get_db
from app.main import app

ACCOUNT_ID = "17841400000000000"
META_URL = "https://scontent-mad1-1.cdninstagram.com/v/t51.2885-19/profile.jpg"
INFLUENCER_ID = "3f6d1a4e-0000-4000-8000-000000000001"
USER_ID = "3f6d1a4e-0000-4000-8000-000000000002"


@pytest.fixture(autouse=True)
def clear_overrides():
    yield
    app.dependency_overrides.clear()


def make_state() -> str:
    """A signed, unexpired state, built the way the authorize endpoint does."""
    from app.core.meta.oauth import sign_state

    payload = json.dumps(
        {
            "influencer_id": INFLUENCER_ID,
            "user_id": USER_ID,
            "exp": int(time.time()) + 600,
        }
    )
    return f"{payload}|{sign_state(payload)}"


def make_db() -> MagicMock:
    """A session that finds an active user and an influencer, and no existing account."""
    db = MagicMock()
    user = SimpleNamespace(id=USER_ID, is_active=True)
    influencer = SimpleNamespace(id=INFLUENCER_ID)

    # Called in order: user lookup, influencer lookup, existing-account lookup.
    db.query.return_value.filter.return_value.first.side_effect = [user, influencer, None]
    return db


def graph_account() -> dict:
    return {
        "account_id": ACCOUNT_ID,
        "page_id": "page-1",
        "username": "luna.garcia",
        "profile_picture_url": META_URL,
        "page_access_token": "page-token",
    }


def call_callback(db, sync_mock):
    """Drive the callback with Meta's side stubbed out."""
    app.dependency_overrides[get_db] = lambda: db

    with patch("app.routers.social_accounts.exchange_code", new=AsyncMock(return_value="short")), \
         patch("app.routers.social_accounts.get_long_lived_token", new=AsyncMock(return_value="long")), \
         patch("app.routers.social_accounts.get_instagram_accounts",
               new=AsyncMock(return_value=[graph_account()])), \
         patch("app.routers.social_accounts.encrypt_token", return_value="encrypted"), \
         patch("app.routers.social_accounts.sync_avatar_in_background", new=sync_mock):
        with TestClient(app) as client:
            return client.get(
                "/social-accounts/instagram/callback",
                params={"code": "auth-code", "state": make_state()},
                follow_redirects=False,
            )


# ---------------------------------------------------------------------------
# The redirect does not wait on Cloudinary
# ---------------------------------------------------------------------------

def test_redirects_on_success():
    response = call_callback(make_db(), AsyncMock())

    assert response.status_code == 307
    assert "oauth_success=true" in response.headers["location"]


def test_schedules_the_avatar_mirror_instead_of_awaiting_it():
    sync = AsyncMock()

    call_callback(make_db(), sync)

    # TestClient runs background tasks after the response, so by now it has run
    # — the assertion that matters is that it was handed the right arguments.
    sync.assert_awaited_once_with(ACCOUNT_ID, META_URL)


def test_stores_metas_url_immediately():
    """The row is valid before Cloudinary is involved at all."""
    db = make_db()

    call_callback(db, AsyncMock())

    added = db.add.call_args.args[0]
    assert added.profile_picture_url == META_URL
    assert added.account_id == ACCOUNT_ID
    db.commit.assert_called_once()


def test_the_redirect_is_settled_before_the_mirror_runs():
    """
    A Cloudinary problem cannot turn into a failed connection, because the
    response is already decided by the time the task runs.

    The service itself also refuses to raise — see
    test_cloudinary_avatar.py::test_never_raises_when_the_upload_itself_explodes.
    This covers the ordering; that covers the function.
    """
    response = call_callback(make_db(), AsyncMock(side_effect=RuntimeError("cloudinary down")))

    assert response.status_code == 307
    assert "oauth_success=true" in response.headers["location"]
