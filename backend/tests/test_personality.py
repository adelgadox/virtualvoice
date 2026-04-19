import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


# ---------------------------------------------------------------------------
# Helpers — minimal fakes (no DB needed)
# ---------------------------------------------------------------------------

def _influencer(system_prompt="You are Layla, a travel influencer.", llm_provider=None):
    inf = MagicMock()
    inf.id = uuid.uuid4()
    inf.name = "Layla"
    inf.system_prompt_core = system_prompt
    inf.llm_provider = llm_provider
    return inf


def _comment(content="Love your outfit!", author_username="fan_user", post_content=None):
    c = MagicMock()
    c.content = content
    c.author_username = author_username
    c.post_content = post_content
    return c


# ---------------------------------------------------------------------------
# PromptBuilder
# ---------------------------------------------------------------------------

class TestBuildPrompt:
    def test_system_prompt_contains_personality(self):
        from app.core.personality.prompt_builder import build_prompt

        inf = _influencer("You are Layla, free spirit traveler.")
        comment = _comment()
        db = MagicMock()

        with patch("app.core.personality.prompt_builder.retrieve_relevant_knowledge", return_value=[]):
            system_prompt, user_message = build_prompt(inf, comment, db)

        assert "Layla" in system_prompt
        assert "free spirit traveler" in system_prompt

    def test_user_message_contains_comment_text(self):
        from app.core.personality.prompt_builder import build_prompt

        inf = _influencer()
        comment = _comment(content="Where did you travel last?", author_username="travelfan")
        db = MagicMock()

        with patch("app.core.personality.prompt_builder.retrieve_relevant_knowledge", return_value=[]):
            _, user_message = build_prompt(inf, comment, db)

        assert "Where did you travel last?" in user_message
        assert "travelfan" in user_message

    def test_knowledge_fragments_injected_into_system_prompt(self):
        from app.core.personality.prompt_builder import build_prompt

        inf = _influencer()
        comment = _comment()
        db = MagicMock()
        fragments = ["Layla loves Bali.", "She hates cold weather."]

        with patch("app.core.personality.prompt_builder.retrieve_relevant_knowledge", return_value=fragments):
            system_prompt, _ = build_prompt(inf, comment, db)

        assert "Layla loves Bali." in system_prompt
        assert "She hates cold weather." in system_prompt

    def test_post_context_included_when_present(self):
        from app.core.personality.prompt_builder import build_prompt

        inf = _influencer()
        comment = _comment(post_content="Just landed in Tokyo! 🗼")
        db = MagicMock()

        with patch("app.core.personality.prompt_builder.retrieve_relevant_knowledge", return_value=[]):
            system_prompt, _ = build_prompt(inf, comment, db)

        assert "Just landed in Tokyo!" in system_prompt

    def test_post_context_omitted_when_none(self):
        from app.core.personality.prompt_builder import build_prompt

        inf = _influencer()
        comment = _comment(post_content=None)
        db = MagicMock()

        with patch("app.core.personality.prompt_builder.retrieve_relevant_knowledge", return_value=[]):
            system_prompt, _ = build_prompt(inf, comment, db)

        assert "Your post" not in system_prompt

    def test_returns_tuple_of_two_strings(self):
        from app.core.personality.prompt_builder import build_prompt

        inf = _influencer()
        comment = _comment()
        db = MagicMock()

        with patch("app.core.personality.prompt_builder.retrieve_relevant_knowledge", return_value=[]):
            result = build_prompt(inf, comment, db)

        assert isinstance(result, tuple)
        assert len(result) == 2
        assert all(isinstance(s, str) for s in result)


# ---------------------------------------------------------------------------
# PersonalityEngine
# ---------------------------------------------------------------------------

class TestPersonalityEngine:
    async def test_generate_returns_llm_response(self):
        from app.core.personality.engine import PersonalityEngine

        inf = _influencer(llm_provider="openai")
        comment = _comment()
        db = MagicMock()

        with patch("app.core.personality.engine.build_prompt", return_value=("sys", "usr")):
            mock_provider = MagicMock()
            mock_provider.generate = AsyncMock(return_value="Thanks so much! 🌸")
            with patch("app.core.personality.engine.get_provider", return_value=mock_provider):
                engine = PersonalityEngine(db)
                result = await engine.generate(inf, comment)

        assert result == "Thanks so much! 🌸"

    async def test_generate_passes_system_and_user_to_provider(self):
        from app.core.personality.engine import PersonalityEngine

        inf = _influencer(llm_provider="gemini")
        comment = _comment()
        db = MagicMock()

        with patch("app.core.personality.engine.build_prompt", return_value=("MY_SYS", "MY_USR")):
            mock_provider = MagicMock()
            mock_provider.generate = AsyncMock(return_value="ok")
            with patch("app.core.personality.engine.get_provider", return_value=mock_provider):
                engine = PersonalityEngine(db)
                await engine.generate(inf, comment)

        mock_provider.generate.assert_awaited_once_with(
            system_prompt="MY_SYS", user_message="MY_USR"
        )

    async def test_generate_uses_influencer_llm_provider(self):
        from app.core.personality.engine import PersonalityEngine

        inf = _influencer(llm_provider="deepseek")
        comment = _comment()
        db = MagicMock()

        with patch("app.core.personality.engine.build_prompt", return_value=("s", "u")):
            mock_provider = MagicMock()
            mock_provider.generate = AsyncMock(return_value="reply")
            with patch("app.core.personality.engine.get_provider", return_value=mock_provider) as mock_factory:
                engine = PersonalityEngine(db)
                await engine.generate(inf, comment)

        mock_factory.assert_called_once_with("deepseek")

    async def test_generate_propagates_llm_exception(self):
        from app.core.personality.engine import PersonalityEngine

        inf = _influencer()
        comment = _comment()
        db = MagicMock()

        with patch("app.core.personality.engine.build_prompt", return_value=("s", "u")):
            mock_provider = MagicMock()
            mock_provider.generate = AsyncMock(side_effect=RuntimeError("LLM down"))
            with patch("app.core.personality.engine.get_provider", return_value=mock_provider):
                engine = PersonalityEngine(db)
                with pytest.raises(RuntimeError, match="LLM down"):
                    await engine.generate(inf, comment)


# ---------------------------------------------------------------------------
# RAG — fallback path (no pgvector)
# ---------------------------------------------------------------------------

class TestRetrieveRelevantKnowledge:
    def test_fallback_returns_content_strings(self):
        from app.core.personality.rag import retrieve_relevant_knowledge

        entry1 = MagicMock()
        entry1.content = "Layla loves surfing."
        entry2 = MagicMock()
        entry2.content = "She studied architecture."

        mock_query = MagicMock()
        mock_query.filter.return_value = mock_query
        mock_query.order_by.return_value = mock_query
        mock_query.limit.return_value = mock_query
        mock_query.all.return_value = [entry1, entry2]

        db = MagicMock()
        db.query.return_value = mock_query

        # _embed.py doesn't exist → try block always raises → fallback runs automatically
        result = retrieve_relevant_knowledge(uuid.uuid4(), "surfing", db, k=5)

        assert result == ["Layla loves surfing.", "She studied architecture."]

    def test_fallback_respects_k_limit(self):
        from app.core.personality.rag import retrieve_relevant_knowledge

        mock_query = MagicMock()
        mock_query.filter.return_value = mock_query
        mock_query.order_by.return_value = mock_query
        mock_query.limit.return_value = mock_query
        mock_query.all.return_value = []

        db = MagicMock()
        db.query.return_value = mock_query

        retrieve_relevant_knowledge(uuid.uuid4(), "query", db, k=3)

        mock_query.limit.assert_called_with(3)
