"""
LLM provider factory.

Gemini and Anthropic use their own SDKs.
Everything else (OpenAI, DeepSeek, Qwen, Perplexity, Groq, Mistral, Ollama,
or any custom OpenAI-compatible API) is handled by OpenAICompatibleProvider.

Adding a new provider:
  1. Set LLM_PROVIDER=<name> in .env
  2. Set <NAME>_API_KEY=... in .env
  3. Optionally set <NAME>_BASE_URL and <NAME>_MODEL
  No code changes required.
"""

from app.core.llm.base import LLMProvider
from app.config import settings

_SDK_PROVIDERS = {"gemini", "anthropic"}


def get_provider(provider_name: str | None = None) -> LLMProvider:
    name = (provider_name or settings.llm_provider).lower().strip()

    if name == "gemini":
        from app.core.llm.gemini import GeminiProvider
        return GeminiProvider()

    if name == "anthropic":
        from app.core.llm.anthropic import AnthropicProvider
        return AnthropicProvider()

    # OpenAI, DeepSeek, Qwen, Perplexity, Groq, Mistral, Ollama, or any custom
    from app.core.llm.openai_compatible import OpenAICompatibleProvider
    return OpenAICompatibleProvider(name)
