import logging

import anthropic as sdk
from anthropic import APIError

from app.config import settings
from app.core.llm.base import LLMProvider

logger = logging.getLogger(__name__)

_MODEL = "claude-haiku-4-5-20251001"
_MAX_TOKENS = 512
_TEMPERATURE = 0.85


class AnthropicProvider(LLMProvider):
    def __init__(self) -> None:
        if not settings.anthropic_api_key:
            raise ValueError("ANTHROPIC_API_KEY is not configured")
        self._client = sdk.AsyncAnthropic(api_key=settings.anthropic_api_key)

    async def generate(self, system_prompt: str, user_message: str) -> str:
        try:
            message = await self._client.messages.create(
                model=_MODEL,
                max_tokens=_MAX_TOKENS,
                temperature=_TEMPERATURE,
                system=system_prompt,
                messages=[{"role": "user", "content": user_message}],
            )
            return message.content[0].text.strip()
        except APIError as e:
            logger.error("Anthropic API error: %s", e)
            raise RuntimeError(f"Anthropic generation failed: {e}") from e
