from app.core.llm.base import LLMProvider
from app.config import settings


def get_provider(provider_name: str | None = None) -> LLMProvider:
    name = (provider_name or settings.llm_provider).lower()

    if name == "gemini":
        from app.core.llm.gemini import GeminiProvider
        return GeminiProvider()
    elif name == "anthropic":
        from app.core.llm.anthropic import AnthropicProvider
        return AnthropicProvider()
    elif name == "openai":
        from app.core.llm.openai import OpenAIProvider
        return OpenAIProvider()
    else:
        raise ValueError(f"Unknown LLM provider: {name}")
