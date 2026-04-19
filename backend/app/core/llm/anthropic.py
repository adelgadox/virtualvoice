import anthropic as sdk
from app.config import settings
from app.core.llm.base import LLMProvider


class AnthropicProvider(LLMProvider):
    def __init__(self):
        self._client = sdk.Anthropic(api_key=settings.anthropic_api_key)

    def generate(self, system_prompt: str, user_message: str) -> str:
        message = self._client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=512,
            system=system_prompt,
            messages=[{"role": "user", "content": user_message}],
        )
        return message.content[0].text.strip()
