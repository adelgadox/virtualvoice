"""
Tests for REST API endpoints and Meta integration.

Uses FastAPI TestClient with mocked DB and external calls.
"""
import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.dependencies import get_current_user
from app.database import get_db


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

def _fake_user():
    u = MagicMock()
    u.id = uuid.uuid4()
    u.email = "test@example.com"
    u.is_active = True
    u.is_admin = True
    return u


def _fake_db():
    return MagicMock()


def _override_auth(db=None):
    """Override FastAPI dependencies so no real DB or JWT is needed."""
    user = _fake_user()
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_db] = lambda: (db or _fake_db())
    return user


def _clear_overrides():
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Influencers
# ---------------------------------------------------------------------------

class TestInfluencersEndpoints:
    def setup_method(self):
        _clear_overrides()

    def test_list_influencers_returns_200(self):
        db = MagicMock()
        db.query.return_value.order_by.return_value.all.return_value = []
        _override_auth(db)

        with TestClient(app) as client:
            res = client.get("/influencers/")

        assert res.status_code == 200
        assert res.json() == []

    def test_create_influencer_returns_201(self):
        inf_id = uuid.uuid4()
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None  # no slug collision

        def fake_refresh(obj):
            obj.id = inf_id
            obj.created_at = datetime.now(timezone.utc)
            obj.updated_at = None

        db.refresh.side_effect = fake_refresh
        _override_auth(db)

        payload = {"name": "Layla", "slug": "layla", "system_prompt_core": "You are Layla."}
        with TestClient(app) as client:
            res = client.post("/influencers/", json=payload)

        assert res.status_code == 201

    def test_create_influencer_duplicate_slug_returns_400(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = MagicMock()  # slug exists
        _override_auth(db)

        payload = {"name": "Layla", "slug": "layla", "system_prompt_core": ""}
        with TestClient(app) as client:
            res = client.post("/influencers/", json=payload)

        assert res.status_code == 400
        assert "Slug" in res.json()["detail"]

    def test_get_influencer_not_found_returns_404(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        _override_auth(db)

        with TestClient(app) as client:
            res = client.get(f"/influencers/{uuid.uuid4()}")

        assert res.status_code == 404


# ---------------------------------------------------------------------------
# Knowledge
# ---------------------------------------------------------------------------

class TestKnowledgeEndpoints:
    def setup_method(self):
        _clear_overrides()

    def test_list_entries_returns_200(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.order_by.return_value.all.return_value = []
        _override_auth(db)

        with TestClient(app) as client:
            res = client.get("/knowledge/")

        assert res.status_code == 200

    def test_create_entry_returns_201(self):
        entry_id = uuid.uuid4()
        db = MagicMock()

        def fake_refresh(obj):
            obj.id = entry_id
            obj.is_active = True
            obj.created_at = datetime.now(timezone.utc)
            obj.updated_at = None

        db.refresh.side_effect = fake_refresh
        _override_auth(db)

        payload = {
            "influencer_id": str(uuid.uuid4()),
            "category": "biography",
            "content": "Layla grew up in Mexico City.",
        }
        with TestClient(app) as client:
            res = client.post("/knowledge/", json=payload)

        assert res.status_code == 201

    def test_delete_entry_soft_deletes(self):
        entry = MagicMock()
        entry.is_active = True
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = entry
        _override_auth(db)

        with TestClient(app) as client:
            res = client.delete(f"/knowledge/{uuid.uuid4()}")

        assert res.status_code == 204
        assert entry.is_active is False

    def test_delete_entry_not_found_returns_404(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        _override_auth(db)

        with TestClient(app) as client:
            res = client.delete(f"/knowledge/{uuid.uuid4()}")

        assert res.status_code == 404


# ---------------------------------------------------------------------------
# Responses
# ---------------------------------------------------------------------------

class TestResponsesEndpoints:
    def setup_method(self):
        _clear_overrides()

    def test_list_pending_returns_200(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.order_by.return_value.all.return_value = []
        _override_auth(db)

        with TestClient(app) as client:
            res = client.get("/responses/pending")

        assert res.status_code == 200

    def _make_resp(self, status="pending"):
        r = MagicMock()
        r.id = uuid.uuid4()
        r.comment_id = uuid.uuid4()
        r.influencer_id = uuid.uuid4()
        r.suggested_text = "Great post!"
        r.final_text = None
        r.llm_provider_used = None
        r.status = status
        r.approved_by = None
        r.approved_at = None
        r.published_at = None
        r.platform_reply_id = None
        r.created_at = datetime.now(timezone.utc)
        r.updated_at = None
        return r

    def test_ignore_response_sets_status_ignored(self):
        resp = self._make_resp()
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = resp
        _override_auth(db)

        with TestClient(app) as client:
            res = client.post(f"/responses/{resp.id}/ignore")

        assert res.status_code == 200
        assert resp.status == "ignored"

    def test_ignore_not_found_returns_404(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        _override_auth(db)

        with TestClient(app) as client:
            res = client.post(f"/responses/{uuid.uuid4()}/ignore")

        assert res.status_code == 404

    def test_approve_without_token_skips_meta_publish(self):
        """When social account has no token, approve succeeds without calling Meta."""
        from app.models.pending_response import PendingResponse
        from app.models.comment import Comment
        from app.models.social_account import SocialAccount

        resp = self._make_resp()
        comment = MagicMock()
        comment.platform_comment_id = "123"
        comment.social_account_id = uuid.uuid4()
        social_account = MagicMock()
        social_account.access_token = None  # no token → skip Meta publish

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
        _override_auth(db)

        with TestClient(app) as client:
            res = client.post(
                f"/responses/{resp.id}/approve",
                json={"approved_by": "admin@example.com"},
            )

        assert res.status_code == 200
        assert resp.platform_reply_id is None

    def test_regenerate_not_found_returns_404(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        _override_auth(db)

        with TestClient(app) as client:
            res = client.post(f"/responses/{uuid.uuid4()}/regenerate")

        assert res.status_code == 404


# ---------------------------------------------------------------------------
# Webhooks
# ---------------------------------------------------------------------------

class TestWebhookEndpoints:
    def test_meta_verify_challenge_succeeds(self):
        import app.config as cfg
        original = cfg.settings.meta_webhook_verify_token
        cfg.settings.meta_webhook_verify_token = "mytoken"

        with TestClient(app) as client:
            res = client.get(
                "/webhooks/meta?hub.mode=subscribe&hub.challenge=abc123&hub.verify_token=mytoken"
            )

        cfg.settings.meta_webhook_verify_token = original
        assert res.status_code == 200
        assert res.text == "abc123"

    def test_meta_verify_wrong_token_returns_403(self):
        import app.config as cfg
        original = cfg.settings.meta_webhook_verify_token
        cfg.settings.meta_webhook_verify_token = "correct"

        with TestClient(app) as client:
            res = client.get(
                "/webhooks/meta?hub.mode=subscribe&hub.challenge=x&hub.verify_token=wrong"
            )

        cfg.settings.meta_webhook_verify_token = original
        assert res.status_code == 403

    def test_meta_event_invalid_signature_returns_403(self):
        import app.config as cfg
        original = cfg.settings.meta_app_secret
        cfg.settings.meta_app_secret = "secret"

        db = MagicMock()
        app.dependency_overrides[get_db] = lambda: db

        with TestClient(app) as client:
            res = client.post(
                "/webhooks/meta",
                json={"object": "instagram", "entry": []},
                headers={"X-Hub-Signature-256": "sha256=badsignature"},
            )

        cfg.settings.meta_app_secret = original
        _clear_overrides()
        assert res.status_code == 403

    def test_meta_event_valid_signature_processes_payload(self):
        import hashlib
        import hmac
        import json
        import app.config as cfg

        cfg.settings.meta_app_secret = "testsecret"
        payload = {"object": "instagram", "entry": []}
        body = json.dumps(payload).encode()
        sig = "sha256=" + hmac.new(b"testsecret", body, hashlib.sha256).hexdigest()

        db = MagicMock()
        app.dependency_overrides[get_db] = lambda: db

        with patch(
            "app.routers.webhooks.handle_meta_webhook",
            new=AsyncMock(return_value=None),
        ) as mock_handler:
            with TestClient(app) as client:
                res = client.post(
                    "/webhooks/meta",
                    content=body,
                    headers={
                        "Content-Type": "application/json",
                        "X-Hub-Signature-256": sig,
                    },
                )

        cfg.settings.meta_app_secret = ""
        _clear_overrides()
        assert res.status_code == 200
        mock_handler.assert_awaited_once()
