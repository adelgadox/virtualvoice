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


# --- OpenAIProvider ---

@pytest.mark.asyncio
async def test_openai_generate_returns_text():
    mock_message = MagicMock()
    mock_message.content = "  Hello from OpenAI  "
    mock_choice = MagicMock()
    mock_choice.message = mock_message
    mock_response = MagicMock()
    mock_response.choices = [mock_choice]

    with patch("app.core.llm.openai.AsyncOpenAI") as mock_client_cls:
        mock_client = MagicMock()
        mock_client.chat.completions.create = AsyncMock(return_value=mock_response)
        mock_client_cls.return_value = mock_client

        from app.core.llm.openai import OpenAIProvider
        with patch("app.core.llm.openai.settings") as mock_settings:
            mock_settings.openai_api_key = "fake-key"
            provider = OpenAIProvider()
            result = await provider.generate("You are an assistant.", "Hello")

    assert result == "Hello from OpenAI"


@pytest.mark.asyncio
async def test_openai_raises_when_no_api_key():
    with patch("app.core.llm.openai.settings") as mock_settings:
        mock_settings.openai_api_key = ""
        with pytest.raises(ValueError, match="OPENAI_API_KEY"):
            from app.core.llm.openai import OpenAIProvider
            OpenAIProvider()


# --- Factory ---

def test_factory_returns_gemini():
    with patch("app.core.llm.factory.settings") as mock_settings:
        mock_settings.llm_provider = "gemini"
        with patch("app.core.llm.factory.GeminiProvider", create=True) as mock_cls:
            mock_cls.return_value = MagicMock()
            from app.core.llm.factory import get_provider
            import importlib, app.core.llm.factory as f
            importlib.reload(f)


def test_factory_raises_on_unknown_provider():
    with patch("app.core.llm.factory.settings") as mock_settings:
        mock_settings.llm_provider = "unknown"
        from app.core.llm.factory import get_provider
        with pytest.raises(ValueError, match="Unknown LLM provider"):
            get_provider("unknown")
