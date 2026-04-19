import logging
from sqlalchemy.orm import Session

from app.models.comment import Comment
from app.models.social_account import SocialAccount
from app.models.pending_response import PendingResponse
from app.core.personality.engine import PersonalityEngine

logger = logging.getLogger(__name__)


def handle_meta_webhook(payload: dict, db: Session) -> None:
    """Process an incoming Meta webhook event."""
    object_type = payload.get("object")
    entries = payload.get("entry", [])

    for entry in entries:
        for change in entry.get("changes", []):
            value = change.get("value", {})
            field = change.get("field")

            if field == "comments":
                _handle_comment(value, object_type, db)


def _handle_comment(value: dict, object_type: str | None, db: Session) -> None:
    platform_comment_id = value.get("id")
    if not platform_comment_id:
        return

    # Skip if already processed
    if db.query(Comment).filter(Comment.platform_comment_id == platform_comment_id).first():
        logger.debug("Comment %s already processed, skipping", platform_comment_id)
        return

    account_id = value.get("from", {}).get("id") or value.get("media", {}).get("id")
    social_account = (
        db.query(SocialAccount).filter(SocialAccount.account_id == account_id).first()
        if account_id
        else None
    )
    if not social_account:
        logger.warning("No social account found for account_id=%s", account_id)
        return

    comment = Comment(
        social_account_id=social_account.id,
        platform_comment_id=platform_comment_id,
        author_username=value.get("from", {}).get("name"),
        author_platform_id=value.get("from", {}).get("id"),
        content=value.get("message", ""),
        post_id=value.get("media", {}).get("id"),
    )
    db.add(comment)
    db.flush()

    engine = PersonalityEngine(db)
    from app.models.influencer import Influencer
    influencer = db.query(Influencer).filter(Influencer.id == social_account.influencer_id).first()
    if not influencer:
        logger.warning("No influencer for social_account %s", social_account.id)
        db.rollback()
        return

    try:
        suggested_text = engine.generate(influencer=influencer, comment=comment)
    except Exception:
        logger.exception("Failed to generate response for comment %s", platform_comment_id)
        db.rollback()
        return

    pending = PendingResponse(
        comment_id=comment.id,
        influencer_id=influencer.id,
        suggested_text=suggested_text,
        llm_provider_used=influencer.llm_provider,
        status="pending",
    )
    db.add(pending)
    comment.processed = True
    db.commit()
    logger.info("Created pending response for comment %s", platform_comment_id)
