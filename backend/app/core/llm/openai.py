import logging

from openai import AsyncOpenAI, APIError

from app.config import settings
from app.core.llm.base import LLMProvider

logger = logging.getLogger(__name__)

_MODEL = "gpt-4o-mini"
_MAX_TOKENS = 512
_TEMPERATURE = 0.85


class OpenAIProvider(LLMProvider):
    def __init__(self) -> None:
        if not settings.openai_api_key:
            raise ValueError("OPENAI_API_KEY is not configured")
        self._client = AsyncOpenAI(api_key=settings.openai_api_key)

    async def generate(self, system_prompt: str, user_message: str) -> str:
        try:
            response = await self._client.chat.completions.create(
                model=_MODEL,
                max_tokens=_MAX_TOKENS,
                temperature=_TEMPERATURE,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ],
            )
            return response.choices[0].message.content.strip()
        except APIError as e:
            logger.error("OpenAI API error: %s", e)
            raise RuntimeError(f"OpenAI generation failed: {e}") from e
