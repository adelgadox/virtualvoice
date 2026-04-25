"""
Token denylist cleanup background job.

Runs every hour. Deletes expired entries from the token_denylist table so it
does not grow unboundedly. The index ix_token_denylist_expires_at makes this
deletion fast even on large tables.
"""
from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone

from app.database import SessionLocal
from app.models.token_denylist import TokenDenylist

logger = logging.getLogger(__name__)

CLEANUP_INTERVAL_SECONDS = 60 * 60  # 1 hour


async def _cleanup_expired_tokens() -> None:
    """Delete all denylist entries whose expires_at is in the past."""
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        deleted = (
            db.query(TokenDenylist)
            .filter(TokenDenylist.expires_at < now)
            .delete(synchronize_session=False)
        )
        db.commit()
        if deleted:
            logger.info("Denylist cleanup: removed %d expired token(s)", deleted)
    except Exception as exc:
        logger.error("Denylist cleanup error: %s", exc)
        db.rollback()
    finally:
        db.close()


async def denylist_cleanup_loop() -> None:
    """Infinite loop: wait 1h then purge expired denylist entries."""
    logger.info("Denylist cleanup job started (interval: 1h)")
    while True:
        await asyncio.sleep(CLEANUP_INTERVAL_SECONDS)
        try:
            await _cleanup_expired_tokens()
        except Exception as exc:
            logger.error("Denylist cleanup loop error: %s", exc)
