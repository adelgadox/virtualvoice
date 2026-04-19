import logging
from sqlalchemy.orm import Session

from app.models.comment import Comment
from app.models.influencer import Influencer
from app.core.personality.prompt_builder import build_prompt
from app.core.llm.factory import get_provider

logger = logging.getLogger(__name__)


class PersonalityEngine:
    def __init__(self, db: Session):
        self._db = db

    async def generate(self, influencer: Influencer, comment: Comment) -> str:
        system_prompt, user_message = build_prompt(influencer=influencer, comment=comment, db=self._db)
        provider = get_provider(influencer.llm_provider)
        try:
            return await provider.generate(system_prompt=system_prompt, user_message=user_message)
        except Exception:
            logger.exception("LLM generation failed for influencer %s", influencer.id)
            raise
