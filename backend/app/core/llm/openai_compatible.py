"""
Generic OpenAI-compatible provider.

Works with any API that follows the OpenAI chat completions spec:
DeepSeek, Qwen, Perplexity, Groq, Together AI, Mistral, Ollama, etc.

Adding a new provider requires ZERO code changes — just env vars:
  LLM_PROVIDER=deepseek
  DEEPSEEK_API_KEY=sk-...
  DEEPSEEK_MODEL=deepseek-chat          # optional — falls back to registry default
  DEEPSEEK_BASE_URL=https://...         # optional — falls back to registry default
"""

import logging
import os

from openai import AsyncOpenAI, APIError

from app.core.llm.base import LLMProvider

logger = logging.getLogger(__name__)

# Registry of known OpenAI-compatible providers.
# base_url=None means use the OpenAI SDK default (api.openai.com).
_REGISTRY: dict[str, dict[str, str | None]] = {
    "openai": {
        "base_url": None,
        "model": "gpt-4o-mini",
    },
    "deepseek": {
        "base_url": "https://api.deepseek.com",
        "model": "deepseek-chat",
    },
    "qwen": {
        "base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1",
        "model": "qwen-plus",
    },
    "perplexity": {
        "base_url": "https://api.perplexity.ai",
        "model": "sonar",
    },
    "groq": {
        "base_url": "https://api.groq.com/openai/v1",
        "model": "llama-3.3-70b-versatile",
    },
    "together": {
        "base_url": "https://api.together.xyz/v1",
        "model": "meta-llama/Llama-3-70b-chat-hf",
    },
    "mistral": {
        "base_url": "https://api.mistral.ai/v1",
        "model": "mistral-small",
    },
    "ollama": {
        "base_url": "http://localhost:11434/v1",
        "model": "llama3",
    },
}

_MAX_TOKENS = 512
_TEMPERATURE = 0.85


class OpenAICompatibleProvider(LLMProvider):
    """
    Resolves config at init time using this priority:
      1. Env var  {PROVIDER}_API_KEY / {PROVIDER}_BASE_URL / {PROVIDER}_MODEL
      2. Known registry defaults
      3. Raises ValueError if neither supplies what is needed
    """

    def __init__(self, provider_name: str) -> None:
        self._name = provider_name
        prefix = provider_name.upper()

        registry = _REGISTRY.get(provider_name, {})

        api_key = os.environ.get(f"{prefix}_API_KEY") or ""
        if not api_key:
            raise ValueError(
                f"'{prefix}_API_KEY' env var is not set for provider '{provider_name}'"
            )

        base_url: str | None = (
            os.environ.get(f"{prefix}_BASE_URL")
            or registry.get("base_url")  # type: ignore[arg-type]
        )
        if base_url is None and provider_name not in _REGISTRY:
            raise ValueError(
                f"'{prefix}_BASE_URL' env var is required for unknown provider '{provider_name}'"
            )

        self._model: str = (
            os.environ.get(f"{prefix}_MODEL")
            or registry.get("model")  # type: ignore[arg-type]
            or "gpt-4o-mini"
        )

        self._client = AsyncOpenAI(api_key=api_key, base_url=base_url)
        logger.info("LLM provider '%s' initialised (model=%s)", provider_name, self._model)

    async def generate(self, system_prompt: str, user_message: str) -> str:
        try:
            response = await self._client.chat.completions.create(
                model=self._model,
                max_tokens=_MAX_TOKENS,
                temperature=_TEMPERATURE,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ],
            )
            return response.choices[0].message.content.strip()
        except APIError as e:
            logger.error("OpenAI-compatible API error (%s): %s", self._name, e)
            raise RuntimeError(f"{self._name} generation failed: {e}") from e
