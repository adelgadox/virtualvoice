import google.generativeai as genai
from app.config import settings
from app.core.llm.base import LLMProvider


class GeminiProvider(LLMProvider):
    def __init__(self):
        genai.configure(api_key=settings.gemini_api_key)
        self._model = genai.GenerativeModel("gemini-2.0-flash")

    def generate(self, system_prompt: str, user_message: str) -> str:
        response = self._model.generate_content(
            f"{system_prompt}\n\n{user_message}",
            generation_config=genai.types.GenerationConfig(
                max_output_tokens=512,
                temperature=0.85,
            ),
        )
        return response.text.strip()
