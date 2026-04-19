from app.core.llm.base import LLMProvider
from app.config import settings

SUPPORTED_PROVIDERS = ("gemini", "anthropic", "openai")


def get_provider(provider_name: str | None = None) -> LLMProvider:
    name = (provider_name or settings.llm_provider).lower()

    if name not in SUPPORTED_PROVIDERS:
        raise ValueError(
            f"Unknown LLM provider '{name}'. Supported: {', '.join(SUPPORTED_PROVIDERS)}"
        )

    if name == "gemini":
        from app.core.llm.gemini import GeminiProvider
        return GeminiProvider()
    elif name == "anthropic":
        from app.core.llm.anthropic import AnthropicProvider
        return AnthropicProvider()
    else:
        from app.core.llm.openai import OpenAIProvider
        return OpenAIProvider()
