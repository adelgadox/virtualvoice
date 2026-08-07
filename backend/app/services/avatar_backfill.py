"""
Backfill for avatars still pointing at Meta's CDN.

Rows created before the Cloudinary mirror hold a signed scontent-*.cdninstagram
URL. Those are blocked by the frontend CSP and expire on their own, so the card
falls back to the influencer's initial.

The stored URL cannot be re-uploaded directly — by now its signature has almost
certainly lapsed — so each account is re-read from the Graph API first, using
its stored page token, and the fresh URL is what gets mirrored.

Accounts self-heal whenever someone reconnects them; this exists to fix the
backlog without waiting for that.
"""
import logging
from dataclasses import dataclass

from sqlalchemy.orm import Session

from app.core.meta.oauth import get_profile_picture_url
from app.models.social_account import SocialAccount
from app.services.cloudinary_avatar import is_configured, upload_avatar
from app.utils.encryption import decrypt_token

logger = logging.getLogger(__name__)

CLOUDINARY_HOST = "res.cloudinary.com"


@dataclass(frozen=True)
class BackfillReport:
    """
    Outcome counts for one run.

    `total_accounts` is what makes a zero readable: no Instagram accounts at
    all is a very different result from none left to migrate, and the two look
    identical if only `scanned` is reported.
    """

    total_accounts: int = 0
    scanned: int = 0
    migrated: int = 0
    skipped_no_token: int = 0
    skipped_no_picture: int = 0
    failed_upload: int = 0

    def with_(self, **changes: int) -> "BackfillReport":
        """Return a copy with the given counters incremented."""
        current = {
            "total_accounts": self.total_accounts,
            "scanned": self.scanned,
            "migrated": self.migrated,
            "skipped_no_token": self.skipped_no_token,
            "skipped_no_picture": self.skipped_no_picture,
            "failed_upload": self.failed_upload,
        }
        for key, delta in changes.items():
            current[key] += delta
        return BackfillReport(**current)


def describe_target(db: Session) -> str:
    """
    host:port/database for the session's connection, with credentials dropped.

    Printed before the run because the most confusing possible outcome is a
    row of zeros from the wrong database — a local docker-compose one, say,
    when production was meant.
    """
    try:
        url = db.get_bind().url
    except Exception:  # pragma: no cover — only reachable with an unbound session
        return "unknown"

    host = url.host or "unknown"
    port = f":{url.port}" if url.port else ""
    database = f"/{url.database}" if url.database else ""
    return f"{host}{port}{database}"


def needs_backfill(account: SocialAccount) -> bool:
    """True when the account's avatar is not yet hosted on Cloudinary."""
    url = account.profile_picture_url
    if not url:
        return False
    return CLOUDINARY_HOST not in url


def find_pending(db: Session) -> list[SocialAccount]:
    """Active Instagram accounts whose avatar still lives on Meta's CDN."""
    candidates = (
        db.query(SocialAccount)
        .filter(
            SocialAccount.platform == "instagram",
            SocialAccount.is_active.is_(True),
            SocialAccount.profile_picture_url.isnot(None),
        )
        .all()
    )
    return [account for account in candidates if needs_backfill(account)]


async def backfill_account(account: SocialAccount, *, dry_run: bool) -> str:
    """
    Mirror one account's avatar into Cloudinary.

    Returns the outcome as a counter name, so the caller can tally without
    interpreting exceptions.
    """
    if not account.access_token:
        logger.warning("Account %s has no stored token — cannot refresh its picture", account.account_id)
        return "skipped_no_token"

    try:
        page_token = decrypt_token(account.access_token)
    except Exception as exc:
        logger.warning("Could not decrypt the token for account %s: %s", account.account_id, exc)
        return "skipped_no_token"

    fresh_url = await get_profile_picture_url(account.account_id, page_token)
    if not fresh_url:
        return "skipped_no_picture"

    if dry_run:
        logger.info("[dry-run] would mirror the avatar for account %s", account.account_id)
        return "migrated"

    mirrored = await upload_avatar(fresh_url, account.account_id)

    # upload_avatar falls back to its input on failure, so an unchanged host
    # means the copy did not happen.
    if not mirrored or CLOUDINARY_HOST not in mirrored:
        return "failed_upload"

    account.profile_picture_url = mirrored
    return "migrated"


async def run_backfill(db: Session, *, dry_run: bool = False) -> BackfillReport:
    """Mirror every pending avatar. Commits once, at the end."""
    if not is_configured():
        raise RuntimeError(
            "Cloudinary is not configured — set CLOUDINARY_CLOUD_NAME, "
            "CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET before running the backfill."
        )

    total_accounts = db.query(SocialAccount).filter(SocialAccount.platform == "instagram").count()
    pending = find_pending(db)
    report = BackfillReport(total_accounts=total_accounts, scanned=len(pending))

    for account in pending:
        outcome = await backfill_account(account, dry_run=dry_run)
        report = report.with_(**{outcome: 1})

    if not dry_run and report.migrated:
        db.commit()

    return report
