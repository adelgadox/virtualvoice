import logging
from sqlalchemy.orm import Session

from app.models.comment import Comment
from app.models.influencer import Influencer
from app.models.social_account import SocialAccount
from app.core.personality.prompt_builder import build_prompt
from app.core.llm.factory import get_provider
from app.core.meta.graph_api import get_recent_posts

logger = logging.getLogger(__name__)


class PersonalityEngine:
    def __init__(self, db: Session):
        self._db = db

    async def generate(self, influencer: Influencer, comment: Comment) -> str:
        # Fetch recent Instagram posts for situational context (best-effort)
        recent_posts: list[str] = []
        social_account = (
            self._db.query(SocialAccount)
            .filter(
                SocialAccount.influencer_id == influencer.id,
                SocialAccount.is_active == True,  # noqa: E712
                SocialAccount.access_token != None,  # noqa: E711
            )
            .first()
        )
        if social_account:
            recent_posts = await get_recent_posts(
                account_id=social_account.account_id,
                access_token=social_account.access_token,
            )

        system_prompt, user_message = build_prompt(
            influencer=influencer,
            comment=comment,
            db=self._db,
            recent_posts=recent_posts or None,
        )
        provider = get_provider(influencer.llm_provider)
        try:
            return await provider.generate(system_prompt=system_prompt, user_message=user_message)
        except Exception:
            logger.exception("LLM generation failed for influencer %s", influencer.id)
            raise
