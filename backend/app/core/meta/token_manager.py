"""
Page Access Token manager.

Responsibilities:
- Validate that a stored token is still accepted by Meta
- Refresh a long-lived user token (re-exchange extends the 60-day window)
- Provide a single entry-point get_valid_token() used before any Meta API call

Note on token types:
  - Long-lived *user* tokens expire after 60 days.
  - *Page* access tokens derived from a long-lived user token are non-expiring
    by default, but are invalidated when the user changes their password,
    deauthorizes the app, or removes the page.

token_expires_at on SocialAccount records the issue date + 60 days as a
best-effort freshness hint. A null value means the token predates this field.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import TYPE_CHECKING

import httpx

from app.config import settings
from app.utils.encryption import decrypt_token

if TYPE_CHECKING:
    from sqlalchemy.orm import Session
    from app.models.social_account import SocialAccount

logger = logging.getLogger(__name__)

_GRAPH = "https://graph.facebook.com/v19.0"
_TOKEN_TTL_DAYS = 60


class TokenInvalidError(Exception):
    """Raised when a stored token is rejected by Meta."""


async def is_token_healthy(access_token: str) -> bool:
    """
    Ping Meta's debug_token endpoint to verify the token is still valid.
    Returns True if Meta accepts it, False otherwise.
    """
    app_token = f"{settings.meta_app_id}|{settings.meta_app_secret}"
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(
            f"{_GRAPH}/debug_token",
            params={"input_token": access_token, "access_token": app_token},
        )
        if resp.status_code != 200:
            return False
        data = resp.json().get("data", {})
        return bool(data.get("is_valid", False))


async def refresh_long_lived_token(access_token: str) -> str:
    """
    Exchange an existing long-lived token for a fresh one (resets the 60-day window).
    Returns the new token string.
    Raises httpx.HTTPStatusError on Meta API errors.
    """
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            f"{_GRAPH}/oauth/access_token",
            params={
                "grant_type": "fb_exchange_token",
                "client_id": settings.meta_app_id,
                "client_secret": settings.meta_app_secret,
                "fb_exchange_token": access_token,
            },
        )
        resp.raise_for_status()
        return resp.json()["access_token"]


async def get_valid_token(account: SocialAccount, db: Session) -> str:
    """
    Return a usable access token for the given social account.

    Strategy:
    1. If token_expires_at is set and more than 7 days away → return as-is (skip network call).
    2. Otherwise → validate via Meta's debug_token endpoint.
    3. If invalid → raise TokenInvalidError (caller should prompt re-auth).
    4. If valid but expiring soon (< 7 days) → attempt a refresh and persist.
    """
    if not account.access_token:
        raise TokenInvalidError(f"No access token stored for account {account.id}")

    plaintext = decrypt_token(account.access_token)

    now = datetime.now(timezone.utc)
    seven_days = timedelta(days=7)

    # Fast path: token was recently issued and isn't close to expiry
    if account.token_expires_at and account.token_expires_at.tzinfo is None:
        expires_at = account.token_expires_at.replace(tzinfo=timezone.utc)
    else:
        expires_at = account.token_expires_at

    if expires_at and (expires_at - now) > seven_days:
        return plaintext

    # Validate with Meta
    healthy = await is_token_healthy(plaintext)

    if not healthy:
        logger.warning("Token for social account %s is invalid — re-auth required", account.id)
        raise TokenInvalidError(
            f"Access token for @{account.username or account.account_id} has been revoked. "
            "Please reconnect the Instagram account."
        )

    # Token is valid — attempt refresh if expiring soon
    if expires_at and (expires_at - now) <= seven_days:
        try:
            new_token = await refresh_long_lived_token(plaintext)
            from app.utils.encryption import encrypt_token
            account.access_token = encrypt_token(new_token)
            account.token_expires_at = now + timedelta(days=_TOKEN_TTL_DAYS)
            db.commit()
            logger.info("Refreshed token for social account %s", account.id)
            return new_token
        except Exception as exc:
            logger.warning("Token refresh failed for account %s: %s — using existing token", account.id, exc)

    return plaintext


def compute_token_expiry() -> datetime:
    """Return the expected expiry datetime for a freshly issued long-lived token."""
    return datetime.now(timezone.utc) + timedelta(days=_TOKEN_TTL_DAYS)
