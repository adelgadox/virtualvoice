"""
Mirror avatars that still point at Meta's CDN into Cloudinary.

Run from the backend directory:

    python -m scripts.backfill_avatars --dry-run
    python -m scripts.backfill_avatars

Needs the same environment as the API: database URL, TOKEN_ENCRYPTION_KEY (to
read the stored page tokens) and the three CLOUDINARY_* variables.

Safe to re-run — accounts already on Cloudinary are skipped, and each upload
overwrites by account_id rather than piling up copies.
"""
import argparse
import asyncio
import logging
import sys

from sqlalchemy.exc import OperationalError

from app.database import SessionLocal
from app.services.avatar_backfill import describe_target, run_backfill

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger("backfill_avatars")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Report what would change without uploading or writing to the database.",
    )
    return parser.parse_args()


async def main() -> int:
    args = parse_args()
    db = SessionLocal()

    # Printed before anything else: a row of zeros is only meaningful once you
    # know which database produced it.
    logger.info("database: %s", describe_target(db))

    try:
        report = await run_backfill(db, dry_run=args.dry_run)
    except RuntimeError as exc:
        logger.error("%s", exc)
        return 1
    except OperationalError as exc:
        # A stack trace here says nothing useful — the actionable part is which
        # host was tried, which is already printed above.
        logger.error("Could not reach the database: %s", exc.orig or exc)
        logger.error("Use `railway run --service virtualvoice ...` to target production.")
        return 1
    finally:
        db.close()

    prefix = "[dry-run] " if args.dry_run else ""
    logger.info("%sinstagram accounts: %d", prefix, report.total_accounts)
    logger.info("%sscanned:            %d", prefix, report.scanned)
    logger.info("%smigrated:           %d", prefix, report.migrated)
    logger.info("%sskipped (no token): %d", prefix, report.skipped_no_token)
    logger.info("%sskipped (no photo): %d", prefix, report.skipped_no_picture)
    logger.info("%sfailed upload:      %d", prefix, report.failed_upload)

    if report.total_accounts == 0:
        logger.warning(
            "No Instagram accounts in this database at all. If you expected some, "
            "check the host above — running against a local database instead of "
            "production is the usual cause."
        )
    elif report.scanned == 0:
        logger.info("Every avatar is already on Cloudinary — nothing to do.")

    if report.failed_upload:
        logger.warning("Some uploads failed — re-run to retry just those.")

    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
