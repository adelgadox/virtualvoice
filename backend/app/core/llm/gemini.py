import logging

import google.generativeai as genai
from google.api_core.exceptions import GoogleAPIError

from app.config import settings
from app.core.llm.base import LLMProvider

logger = logging.getLogger(__name__)

_MODEL = "gemini-2.0-flash"
_MAX_TOKENS = 512
_TEMPERATURE = 0.85


class GeminiProvider(LLMProvider):
    def __init__(self) -> None:
        if not settings.gemini_api_key:
            raise ValueError("GEMINI_API_KEY is not configured")
        genai.configure(api_key=settings.gemini_api_key)

    async def generate(self, system_prompt: str, user_message: str) -> str:
        try:
            model = genai.GenerativeModel(
                model_name=_MODEL,
                system_instruction=system_prompt,
            )
            response = await model.generate_content_async(
                user_message,
                generation_config=genai.types.GenerationConfig(
                    max_output_tokens=_MAX_TOKENS,
                    temperature=_TEMPERATURE,
                ),
            )
            return response.text.strip()
        except GoogleAPIError as e:
            logger.error("Gemini API error: %s", e)
            raise RuntimeError(f"Gemini generation failed: {e}") from e
