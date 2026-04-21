"""
Tests for the RAG pipeline:
- embed_text / try_embed
- retrieve_relevant_knowledge (pgvector path + fallback path)
- Feedback loop: voice_examples saved on approve
"""
import uuid
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

import pytest

from app.core.personality._embed import embed_text, try_embed


# ---------------------------------------------------------------------------
# embed_text / try_embed
# ---------------------------------------------------------------------------

class TestEmbedText:
    def test_embed_text_returns_768_dim_vector(self):
        fake_embedding = [0.1] * 768
        with patch("app.core.personality._embed.genai") as mock_genai, \
             patch("app.core.personality._embed.settings") as mock_settings:
            mock_settings.gemini_api_key = "fake-key"
            mock_genai.embed_content.return_value = {"embedding": fake_embedding}

            result = embed_text("Hello world")

        assert result == fake_embedding
        assert len(result) == 768
        mock_genai.embed_content.assert_called_once_with(
            model="models/text-embedding-004",
            content="Hello world",
            output_dimensionality=768,
        )

    def test_embed_text_raises_when_no_api_key(self):
        with patch("app.core.personality._embed.settings") as mock_settings:
            mock_settings.gemini_api_key = ""
            with pytest.raises(ValueError, match="GEMINI_API_KEY"):
                embed_text("test")

    def test_try_embed_returns_none_on_missing_key(self):
        with patch("app.core.personality._embed.settings") as mock_settings:
            mock_settings.gemini_api_key = ""
            result = try_embed("test")
        assert result is None

    def test_try_embed_returns_none_on_api_error(self):
        with patch("app.core.personality._embed.genai") as mock_genai, \
             patch("app.core.personality._embed.settings") as mock_settings:
            mock_settings.gemini_api_key = "fake-key"
            mock_genai.embed_content.side_effect = RuntimeError("API down")

            result = try_embed("test")

        assert result is None

    def test_try_embed_returns_vector_on_success(self):
        fake_embedding = [0.5] * 768
        with patch("app.core.personality._embed.genai") as mock_genai, \
             patch("app.core.personality._embed.settings") as mock_settings:
            mock_settings.gemini_api_key = "fake-key"
            mock_genai.embed_content.return_value = {"embedding": fake_embedding}

            result = try_embed("Hello")

        assert result == fake_embedding


# ---------------------------------------------------------------------------
# retrieve_relevant_knowledge
# ---------------------------------------------------------------------------

class TestRetrieveRelevantKnowledge:
    def _make_entry(self, content: str):
        e = MagicMock()
        e.content = content
        e.embedding = [0.1] * 768
        e.is_active = True
        e.updated_at = datetime.now(timezone.utc)
        return e

    def test_pgvector_path_returns_content_list(self):
        from app.core.personality.rag import retrieve_relevant_knowledge

        entries = [self._make_entry("Luna grew up in CDMX"), self._make_entry("She loves tacos")]
        db = MagicMock()
        db.query.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value = entries

        fake_vec = [0.2] * 768
        # Patch Vector to be non-None so the pgvector branch is taken
        # even in environments where the pgvector Python package isn't installed.
        with patch("app.core.personality.rag.embed_text", return_value=fake_vec) as mock_embed, \
             patch("app.core.personality.rag.Vector", new=object()):
            result = retrieve_relevant_knowledge(uuid.uuid4(), "Tell me about Luna", db, k=2)

        assert result == ["Luna grew up in CDMX", "She loves tacos"]
        mock_embed.assert_called_once_with("Tell me about Luna")

    def test_fallback_used_when_embed_fails(self):
        from app.core.personality.rag import retrieve_relevant_knowledge

        entries = [self._make_entry("Fallback entry")]
        db = MagicMock()
        # First query (pgvector path) raises, second (fallback) returns entries
        call_count = 0

        def query_side(*args):
            nonlocal call_count
            call_count += 1
            q = MagicMock()
            q.filter.return_value.order_by.return_value.limit.return_value.all.return_value = entries
            return q

        db.query.side_effect = query_side

        with patch("app.core.personality.rag.embed_text", side_effect=RuntimeError("no key")):
            result = retrieve_relevant_knowledge(uuid.uuid4(), "query", db, k=5)

        assert result == ["Fallback entry"]

    def test_returns_empty_list_when_no_entries(self):
        from app.core.personality.rag import retrieve_relevant_knowledge

        db = MagicMock()
        db.query.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value = []

        with patch("app.core.personality.rag.embed_text", side_effect=RuntimeError("no key")):
            result = retrieve_relevant_knowledge(uuid.uuid4(), "query", db)

        assert result == []


# ---------------------------------------------------------------------------
# Feedback loop — voice_examples saved on approve
# ---------------------------------------------------------------------------

class TestFeedbackLoop:
    def _make_resp(self, influencer_id=None):
        r = MagicMock()
        r.id = uuid.uuid4()
        r.comment_id = uuid.uuid4()
        r.influencer_id = influencer_id or uuid.uuid4()
        r.suggested_text = "Great post!"
        r.final_text = None
        r.llm_provider_used = None
        r.status = "pending"
        r.approved_by = None
        r.approved_at = None
        r.published_at = None
        r.platform_reply_id = None
        r.created_at = datetime.now(timezone.utc)
        r.updated_at = None
        r.comment_content = None
        r.comment_author = None
        return r

    def test_approve_saves_voice_example_entry(self):
        from fastapi.testclient import TestClient
        from app.main import app
        from app.dependencies import get_current_user
        from app.database import get_db
        from app.models.pending_response import PendingResponse
        from app.models.comment import Comment
        from app.models.social_account import SocialAccount
        from app.models.knowledge_entry import KnowledgeEntry

        resp = self._make_resp()
        comment = MagicMock()
        comment.content = "What's your routine?"
        comment.platform_comment_id = "ext-123"
        comment.social_account_id = uuid.uuid4()
        comment.author_username = "fan1"
        social_account = MagicMock()
        social_account.access_token = None  # skip Meta publish

        added_entries: list = []

        def query_side_effect(model):
            q = MagicMock()
            q.filter.return_value.first.return_value = {
                PendingResponse: resp,
                Comment: comment,
                SocialAccount: social_account,
            }.get(model)
            return q

        db = MagicMock()
        db.query.side_effect = query_side_effect
        db.add.side_effect = lambda obj: added_entries.append(obj) if isinstance(obj, KnowledgeEntry) else None

        user = MagicMock()
        user.is_active = True
        user.is_admin = True
        user.email = "admin@test.com"
        app.dependency_overrides[get_current_user] = lambda: user
        app.dependency_overrides[get_db] = lambda: db

        with patch("app.routers.responses.try_embed", return_value=[0.1] * 768):
            with TestClient(app) as client:
                res = client.post(
                    f"/responses/{resp.id}/approve",
                    json={},
                )

        app.dependency_overrides.clear()

        assert res.status_code == 200
        assert len(added_entries) == 1
        entry = added_entries[0]
        assert entry.category == "voice_examples"
        assert "What's your routine?" in entry.content
        assert "Great post!" in entry.content

    def test_approve_without_comment_skips_voice_example(self):
        from fastapi.testclient import TestClient
        from app.main import app
        from app.dependencies import get_current_user
        from app.database import get_db
        from app.models.pending_response import PendingResponse
        from app.models.comment import Comment
        from app.models.social_account import SocialAccount
        from app.models.knowledge_entry import KnowledgeEntry

        resp = self._make_resp()

        def query_side_effect(model):
            q = MagicMock()
            q.filter.return_value.first.return_value = {
                PendingResponse: resp,
                Comment: None,  # no comment
                SocialAccount: None,
            }.get(model)
            return q

        db = MagicMock()
        db.query.side_effect = query_side_effect
        added_entries: list = []
        db.add.side_effect = lambda obj: added_entries.append(obj) if isinstance(obj, KnowledgeEntry) else None

        user = MagicMock()
        user.is_active = True
        user.is_admin = True
        user.email = "admin@test.com"
        app.dependency_overrides[get_current_user] = lambda: user
        app.dependency_overrides[get_db] = lambda: db

        with TestClient(app) as client:
            res = client.post(
                f"/responses/{resp.id}/approve",
                json={},
            )

        app.dependency_overrides.clear()
        assert res.status_code == 200
        assert len(added_entries) == 0
