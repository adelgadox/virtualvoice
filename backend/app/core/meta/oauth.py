"""
Meta / Instagram OAuth helpers.

Flow:
  1. build_auth_url()  → redirect user to Meta
  2. exchange_code()   → short-lived user token
  3. get_long_lived_token() → 60-day token
  4. get_instagram_account() → Instagram Business account ID + username
"""
import hashlib
import hmac
import logging
from urllib.parse import urlencode

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

from app.core.meta import GRAPH_API_VERSION
_GRAPH = f"https://graph.facebook.com/{GRAPH_API_VERSION}"
_SCOPES = [
    "instagram_basic",
    "instagram_manage_comments",
    "pages_show_list",
    "pages_read_engagement",
]


def build_auth_url(state: str) -> str:
    """Return the Meta OAuth dialog URL to redirect the user to."""
    params = {
        "client_id": settings.meta_app_id,
        "redirect_uri": settings.meta_oauth_redirect_uri,
        "scope": ",".join(_SCOPES),
        "response_type": "code",
        "state": state,
    }
    return f"https://www.facebook.com/dialog/oauth?{urlencode(params)}"


async def exchange_code(code: str) -> str:
    """Exchange an authorization code for a short-lived user access token."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{_GRAPH}/oauth/access_token",
            params={
                "client_id": settings.meta_app_id,
                "client_secret": settings.meta_app_secret,
                "redirect_uri": settings.meta_oauth_redirect_uri,
                "code": code,
            },
        )
        resp.raise_for_status()
        return resp.json()["access_token"]


async def get_long_lived_token(short_lived_token: str) -> str:
    """Exchange a short-lived token for a 60-day long-lived token."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{_GRAPH}/oauth/access_token",
            params={
                "grant_type": "fb_exchange_token",
                "client_id": settings.meta_app_id,
                "client_secret": settings.meta_app_secret,
                "fb_exchange_token": short_lived_token,
            },
        )
        resp.raise_for_status()
        data = resp.json()
        return data["access_token"]


async def get_instagram_accounts(user_token: str) -> list[dict]:
    """
    Return all Instagram Business accounts connected to the user's Facebook Pages.

    Each item: {"account_id": str, "page_id": str, "username": str}
    """
    async with httpx.AsyncClient() as client:
        # Get all pages the user manages
        pages_resp = await client.get(
            f"{_GRAPH}/me/accounts",
            params={"access_token": user_token, "fields": "id,name,access_token,instagram_business_account"},
        )
        pages_resp.raise_for_status()
        pages = pages_resp.json().get("data", [])

        accounts = []
        for page in pages:
            ig = page.get("instagram_business_account")
            if not ig:
                continue
            ig_id = ig["id"]
            # Get username for display
            ig_resp = await client.get(
                f"{_GRAPH}/{ig_id}",
                params={"fields": "id,username,profile_picture_url", "access_token": page["access_token"]},
            )
            if ig_resp.status_code != 200:
                continue
            ig_data = ig_resp.json()
            accounts.append({
                "account_id": ig_id,
                "page_id": page["id"],
                "username": ig_data.get("username", ""),
                "profile_picture_url": ig_data.get("profile_picture_url"),
                "page_access_token": page["access_token"],
            })

    return accounts


def _state_secret() -> bytes:
    """Return the dedicated OAuth state secret, falling back to the JWT secret if unset."""
    return (settings.meta_oauth_state_secret or settings.secret_key).encode()


def verify_state(state: str, expected_hmac: str) -> bool:
    """Verify the OAuth state parameter hasn't been tampered with."""
    computed = hmac.new(_state_secret(), state.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(computed, expected_hmac)


def sign_state(state: str) -> str:
    """Sign the OAuth state parameter."""
    return hmac.new(_state_secret(), state.encode(), hashlib.sha256).hexdigest()
