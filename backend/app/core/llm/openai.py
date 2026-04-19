from openai import OpenAI
from app.config import settings
from app.core.llm.base import LLMProvider


class OpenAIProvider(LLMProvider):
    def __init__(self):
        self._client = OpenAI(api_key=settings.openai_api_key)

    def generate(self, system_prompt: str, user_message: str) -> str:
        response = self._client.chat.completions.create(
            model="gpt-4o-mini",
            max_tokens=512,
            temperature=0.85,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
        )
        return response.choices[0].message.content.strip()
