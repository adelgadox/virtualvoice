"""
Automatic token renewal background job (Phase 4.4).

Runs every 24 hours. For every active social account whose token expires
within TOKEN_RENEWAL_THRESHOLD_DAYS, calls get_valid_token() which handles
the actual Meta API refresh and DB update.
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models.social_account import SocialAccount

logger = logging.getLogger(__name__)

RENEWAL_INTERVAL_SECONDS = 24 * 60 * 60  # 24 hours
TOKEN_RENEWAL_THRESHOLD_DAYS = 7


async def _renew_expiring_tokens() -> None:
    """Check all active social accounts and refresh tokens expiring soon."""
    db: Session = SessionLocal()
    try:
        threshold = datetime.now(timezone.utc) + timedelta(days=TOKEN_RENEWAL_THRESHOLD_DAYS)

        candidates = (
            db.query(SocialAccount)
            .filter(
                SocialAccount.is_active == True,  # noqa: E712
                SocialAccount.access_token != None,  # noqa: E711
                SocialAccount.token_expires_at != None,  # noqa: E711
                SocialAccount.token_expires_at <= threshold,
            )
            .all()
        )

        if not candidates:
            logger.info("Token renewal: no tokens expiring within %d days", TOKEN_RENEWAL_THRESHOLD_DAYS)
            return

        logger.info("Token renewal: found %d account(s) with tokens expiring soon", len(candidates))

        from app.core.meta.token_manager import get_valid_token, TokenInvalidError

        renewed = 0
        failed = 0
        for account in candidates:
            try:
                await get_valid_token(account, db)
                renewed += 1
            except TokenInvalidError:
                logger.warning(
                    "Token renewal: account %s (@%s) token is invalid — manual re-auth required",
                    account.id,
                    account.username or account.account_id,
                )
                failed += 1
            except Exception as exc:
                logger.error("Token renewal: unexpected error for account %s: %s", account.id, exc)
                failed += 1

        logger.info("Token renewal complete: %d renewed, %d failed/invalid", renewed, failed)

    finally:
        db.close()


async def token_renewal_loop() -> None:
    """Infinite loop: wait 24h then renew expiring tokens."""
    logger.info("Token renewal job started (interval: %dh)", RENEWAL_INTERVAL_SECONDS // 3600)
    while True:
        await asyncio.sleep(RENEWAL_INTERVAL_SECONDS)
        try:
            await _renew_expiring_tokens()
        except Exception as exc:
            logger.error("Token renewal loop error: %s", exc)
