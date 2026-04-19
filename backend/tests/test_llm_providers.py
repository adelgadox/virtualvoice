import pytest
from unittest.mock import AsyncMock, MagicMock, patch


# --- GeminiProvider ---

@pytest.mark.asyncio
async def test_gemini_generate_returns_text():
    mock_response = MagicMock()
    mock_response.text = "  Hello from Gemini  "

    with patch("app.core.llm.gemini.genai") as mock_genai:
        mock_model = MagicMock()
        mock_model.generate_content_async = AsyncMock(return_value=mock_response)
        mock_genai.GenerativeModel.return_value = mock_model
        mock_genai.types.GenerationConfig = MagicMock()

        from app.core.llm.gemini import GeminiProvider
        with patch("app.core.llm.gemini.settings") as mock_settings:
            mock_settings.gemini_api_key = "fake-key"
            provider = GeminiProvider()
            result = await provider.generate("You are an assistant.", "Hello")

    assert result == "Hello from Gemini"


@pytest.mark.asyncio
async def test_gemini_raises_when_no_api_key():
    with patch("app.core.llm.gemini.settings") as mock_settings:
        mock_settings.gemini_api_key = ""
        with pytest.raises(ValueError, match="GEMINI_API_KEY"):
            from app.core.llm.gemini import GeminiProvider
            GeminiProvider()


# --- AnthropicProvider ---

@pytest.mark.asyncio
async def test_anthropic_generate_returns_text():
    mock_content = MagicMock()
    mock_content.text = "  Hello from Anthropic  "
    mock_message = MagicMock()
    mock_message.content = [mock_content]

    with patch("app.core.llm.anthropic.sdk") as mock_sdk:
        mock_client = MagicMock()
        mock_client.messages.create = AsyncMock(return_value=mock_message)
        mock_sdk.AsyncAnthropic.return_value = mock_client

        from app.core.llm.anthropic import AnthropicProvider
        with patch("app.core.llm.anthropic.settings") as mock_settings:
            mock_settings.anthropic_api_key = "fake-key"
            provider = AnthropicProvider()
            result = await provider.generate("You are an assistant.", "Hello")

    assert result == "Hello from Anthropic"


@pytest.mark.asyncio
async def test_anthropic_raises_when_no_api_key():
    with patch("app.core.llm.anthropic.settings") as mock_settings:
        mock_settings.anthropic_api_key = ""
        with pytest.raises(ValueError, match="ANTHROPIC_API_KEY"):
            from app.core.llm.anthropic import AnthropicProvider
            AnthropicProvider()


# --- OpenAICompatibleProvider ---

@pytest.mark.asyncio
async def test_openai_compatible_generate_returns_text():
    mock_message = MagicMock()
    mock_message.content = "  Hello from OpenAI  "
    mock_choice = MagicMock()
    mock_choice.message = mock_message
    mock_response = MagicMock()
    mock_response.choices = [mock_choice]

    with patch("app.core.llm.openai_compatible.AsyncOpenAI") as mock_client_cls:
        mock_client = MagicMock()
        mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
        mock_client_cls.return_value = mock_client

        import os
        with patch.dict(os.environ, {"OPENAI_API_KEY": "fake-key"}):
            from app.core.llm.openai_compatible import OpenAICompatibleProvider
            provider = OpenAICompatibleProvider("openai")
            result = await provider.generate("You are an assistant.", "Hello")

    assert result == "Hello from OpenAI"


def test_openai_compatible_raises_when_no_api_key():
    import os
    with patch.dict(os.environ, {}, clear=True):
        # Remove key if present
        os.environ.pop("OPENAI_API_KEY", None)
        from app.core.llm.openai_compatible import OpenAICompatibleProvider
        with pytest.raises(ValueError, match="OPENAI_API_KEY"):
            OpenAICompatibleProvider("openai")


@pytest.mark.asyncio
async def test_openai_compatible_deepseek_generate():
    """DeepSeek uses registry defaults; only API key needed."""
    mock_message = MagicMock()
    mock_message.content = "  Hello from DeepSeek  "
    mock_choice = MagicMock()
    mock_choice.message = mock_message
    mock_response = MagicMock()
    mock_response.choices = [mock_choice]

    with patch("app.core.llm.openai_compatible.AsyncOpenAI") as mock_client_cls:
        mock_client = MagicMock()
        mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
        mock_client_cls.return_value = mock_client

        import os
        with patch.dict(os.environ, {"DEEPSEEK_API_KEY": "fake-deepseek-key"}):
            from app.core.llm.openai_compatible import OpenAICompatibleProvider
            provider = OpenAICompatibleProvider("deepseek")
            result = await provider.generate("You are an assistant.", "Hello")

    assert result == "Hello from DeepSeek"


def test_openai_compatible_unknown_provider_requires_base_url():
    import os
    with patch.dict(os.environ, {"MYPROVIDER_API_KEY": "fake-key"}, clear=False):
        os.environ.pop("MYPROVIDER_BASE_URL", None)
        from app.core.llm.openai_compatible import OpenAICompatibleProvider
        with pytest.raises(ValueError, match="MYPROVIDER_BASE_URL"):
            OpenAICompatibleProvider("myprovider")


def test_openai_compatible_unknown_provider_with_base_url():
    import os
    with patch("app.core.llm.openai_compatible.AsyncOpenAI"):
        with patch.dict(os.environ, {
            "MYPROVIDER_API_KEY": "fake-key",
            "MYPROVIDER_BASE_URL": "https://api.myprovider.com/v1",
        }):
            from app.core.llm.openai_compatible import OpenAICompatibleProvider
            provider = OpenAICompatibleProvider("myprovider")
            assert provider._name == "myprovider"


# --- Factory ---

def test_factory_returns_gemini_provider():
    import app.core.llm.gemini  # ensure module is loaded before patching
    with patch("app.core.llm.gemini.settings") as gs:
        gs.gemini_api_key = "fake-key"
        with patch("app.core.llm.gemini.genai"):
            from app.core.llm.factory import get_provider
            from app.core.llm.gemini import GeminiProvider
            provider = get_provider("gemini")
            assert isinstance(provider, GeminiProvider)


def test_factory_returns_openai_compatible_for_openai():
    import os
    with patch("app.core.llm.openai_compatible.AsyncOpenAI"):
        with patch.dict(os.environ, {"OPENAI_API_KEY": "fake-key"}):
            from app.core.llm.factory import get_provider
            from app.core.llm.openai_compatible import OpenAICompatibleProvider
            provider = get_provider("openai")
            assert isinstance(provider, OpenAICompatibleProvider)


def test_factory_returns_openai_compatible_for_deepseek():
    import os
    with patch("app.core.llm.openai_compatible.AsyncOpenAI"):
        with patch.dict(os.environ, {"DEEPSEEK_API_KEY": "fake-key"}):
            from app.core.llm.factory import get_provider
            from app.core.llm.openai_compatible import OpenAICompatibleProvider
            provider = get_provider("deepseek")
            assert isinstance(provider, OpenAICompatibleProvider)


def test_factory_returns_openai_compatible_for_groq():
    import os
    with patch("app.core.llm.openai_compatible.AsyncOpenAI"):
        with patch.dict(os.environ, {"GROQ_API_KEY": "fake-key"}):
            from app.core.llm.factory import get_provider
            from app.core.llm.openai_compatible import OpenAICompatibleProvider
            provider = get_provider("groq")
            assert isinstance(provider, OpenAICompatibleProvider)
