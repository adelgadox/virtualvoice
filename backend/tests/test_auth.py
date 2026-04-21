"""
Integration tests for auth endpoints.

Exercises /auth/register, /auth/login, /auth/google, and /auth/me
with a mocked DB — the JWT creation/validation runs for real.
"""
import uuid
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

import jwt
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.database import get_db
from app.config import settings


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_user(
    *,
    email: str = "user@example.com",
    hashed_password: str | None = None,
    is_active: bool = True,
    is_admin: bool = False,
    google_id: str | None = None,
    avatar_url: str | None = None,
    auth_provider: str = "credentials",
):
    import bcrypt

    if hashed_password is None:
        hashed_password = bcrypt.hashpw(b"password123", bcrypt.gensalt()).decode()

    u = MagicMock()
    u.id = str(uuid.uuid4())
    u.email = email
    u.hashed_password = hashed_password
    u.full_name = "Test User"
    u.is_active = is_active
    u.is_admin = is_admin
    u.google_id = google_id
    u.avatar_url = avatar_url
    u.auth_provider = auth_provider
    u.created_at = datetime.now(timezone.utc)
    u.updated_at = None
    return u


def _valid_token(user_id: str) -> str:
    from datetime import timedelta

    expire = datetime.now(timezone.utc) + timedelta(minutes=60)
    return jwt.encode(
        {"sub": user_id, "exp": expire},
        settings.secret_key,
        algorithm=settings.algorithm,
    )


def _db_with(user=None):
    """Return a mocked DB whose first() returns the given user."""
    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = user
    return db


def _clear():
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# POST /auth/register
# ---------------------------------------------------------------------------

class TestRegister:
    def setup_method(self):
        _clear()

    def test_register_new_user_returns_201_with_token(self):
        user = _make_user()
        db = MagicMock()
        # First query (email check) returns None, then refresh sets the user
        db.query.return_value.filter.return_value.first.return_value = None
        db.refresh.side_effect = lambda u: setattr(u, "id", user.id)
        app.dependency_overrides[get_db] = lambda: db

        with TestClient(app) as client:
            res = client.post(
                "/auth/register",
                json={"email": "new@example.com", "password": "strongpass"},
            )

        assert res.status_code == 201
        body = res.json()
        assert "access_token" in body
        assert body["token_type"] == "bearer"

    def test_register_duplicate_email_returns_409(self):
        existing = _make_user()
        db = _db_with(user=existing)
        app.dependency_overrides[get_db] = lambda: db

        with TestClient(app) as client:
            res = client.post(
                "/auth/register",
                json={"email": "existing@example.com", "password": "strongpass"},
            )

        assert res.status_code == 409
        assert "already registered" in res.json()["detail"]

    def test_register_short_password_returns_422(self):
        db = _db_with(user=None)
        app.dependency_overrides[get_db] = lambda: db

        with TestClient(app) as client:
            res = client.post(
                "/auth/register",
                json={"email": "x@example.com", "password": "short"},
            )

        assert res.status_code == 422

    def test_register_invalid_email_returns_422(self):
        db = _db_with(user=None)
        app.dependency_overrides[get_db] = lambda: db

        with TestClient(app) as client:
            res = client.post(
                "/auth/register",
                json={"email": "not-an-email", "password": "strongpass"},
            )

        assert res.status_code == 422

    def test_register_with_full_name(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        captured = {}

        def fake_refresh(u):
            u.id = uuid.uuid4()
            captured["user"] = u

        db.refresh.side_effect = fake_refresh
        app.dependency_overrides[get_db] = lambda: db

        with TestClient(app) as client:
            res = client.post(
                "/auth/register",
                json={"email": "full@example.com", "password": "strongpass", "full_name": "Full Name"},
            )

        assert res.status_code == 201


# ---------------------------------------------------------------------------
# POST /auth/login
# ---------------------------------------------------------------------------

class TestLogin:
    def setup_method(self):
        _clear()

    def test_login_valid_credentials_returns_token(self):
        import bcrypt

        hashed = bcrypt.hashpw(b"correctpass", bcrypt.gensalt()).decode()
        user = _make_user(hashed_password=hashed)
        db = _db_with(user=user)
        app.dependency_overrides[get_db] = lambda: db

        with TestClient(app) as client:
            res = client.post(
                "/auth/login",
                json={"email": "user@example.com", "password": "correctpass"},
            )

        assert res.status_code == 200
        assert "access_token" in res.json()

    def test_login_wrong_password_returns_401(self):
        import bcrypt

        hashed = bcrypt.hashpw(b"correctpass", bcrypt.gensalt()).decode()
        user = _make_user(hashed_password=hashed)
        db = _db_with(user=user)
        app.dependency_overrides[get_db] = lambda: db

        with TestClient(app) as client:
            res = client.post(
                "/auth/login",
                json={"email": "user@example.com", "password": "wrongpass"},
            )

        assert res.status_code == 401
        assert "Invalid credentials" in res.json()["detail"]

    def test_login_user_not_found_returns_401(self):
        db = _db_with(user=None)
        app.dependency_overrides[get_db] = lambda: db

        with TestClient(app) as client:
            res = client.post(
                "/auth/login",
                json={"email": "ghost@example.com", "password": "anypass1"},
            )

        assert res.status_code == 401

    def test_login_inactive_user_returns_401(self):
        import bcrypt

        hashed = bcrypt.hashpw(b"pass1234", bcrypt.gensalt()).decode()
        # Inactive users are filtered out by the query (is_active == True)
        db = _db_with(user=None)
        app.dependency_overrides[get_db] = lambda: db

        with TestClient(app) as client:
            res = client.post(
                "/auth/login",
                json={"email": "inactive@example.com", "password": "pass1234"},
            )

        assert res.status_code == 401

    def test_login_user_without_password_returns_401(self):
        """Google-only accounts have no hashed_password."""
        user = _make_user(hashed_password=None, auth_provider="google")
        db = _db_with(user=user)
        app.dependency_overrides[get_db] = lambda: db

        with TestClient(app) as client:
            res = client.post(
                "/auth/login",
                json={"email": "google@example.com", "password": "anypass1"},
            )

        assert res.status_code == 401


# ---------------------------------------------------------------------------
# POST /auth/google
# ---------------------------------------------------------------------------

class TestGoogleAuth:
    """
    /auth/google now verifies the Google ID token server-side via
    google.oauth2.id_token.verify_oauth2_token. All tests patch that function
    so no real HTTP call to Google is made.
    """

    def setup_method(self):
        _clear()

    _FAKE_IDINFO = {
        "sub": "g-123",
        "email": "google@example.com",
        "name": "Google User",
        "picture": None,
    }

    def _post_google(self, client, idinfo: dict | None = None, id_token: str = "fake-id-token"):
        """Send POST /auth/google with a patched verify_oauth2_token."""
        resolved = idinfo if idinfo is not None else self._FAKE_IDINFO
        with patch(
            "app.routers.auth._verify_google_id_token",
            return_value=resolved,
        ):
            return client.post("/auth/google", json={"id_token": id_token})

    def test_google_new_user_creates_and_returns_token(self):
        db = MagicMock()
        # Both lookups (by google_id, by email) return None → create new user
        db.query.return_value.filter.return_value.first.return_value = None
        created = {}

        def fake_refresh(u):
            u.id = uuid.uuid4()
            u.is_active = True
            created["user"] = u

        db.refresh.side_effect = fake_refresh
        app.dependency_overrides[get_db] = lambda: db

        with TestClient(app) as client:
            res = self._post_google(client)

        assert res.status_code == 200
        assert "access_token" in res.json()

    def test_google_existing_user_by_google_id_returns_token(self):
        user = _make_user(google_id="g-123", auth_provider="google")
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = user
        app.dependency_overrides[get_db] = lambda: db

        with TestClient(app) as client:
            res = self._post_google(client)

        assert res.status_code == 200
        assert "access_token" in res.json()

    def test_google_existing_user_by_email_syncs_google_id(self):
        user = _make_user(google_id=None, auth_provider="credentials")
        db = MagicMock()
        call_count = 0

        def first_side_effect():
            nonlocal call_count
            call_count += 1
            return None if call_count == 1 else user

        db.query.return_value.filter.return_value.first.side_effect = first_side_effect
        app.dependency_overrides[get_db] = lambda: db

        with TestClient(app) as client:
            res = self._post_google(client)

        assert res.status_code == 200
        assert user.google_id == "g-123"

    def test_google_disabled_account_returns_403(self):
        user = _make_user(google_id="g-456", is_active=False)
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = user
        app.dependency_overrides[get_db] = lambda: db

        with TestClient(app) as client:
            res = self._post_google(client, idinfo={**self._FAKE_IDINFO, "sub": "g-456"})

        assert res.status_code == 403
        assert "disabled" in res.json()["detail"]

    def test_google_invalid_token_returns_401(self):
        app.dependency_overrides[get_db] = lambda: MagicMock()

        with patch(
            "app.routers.auth._verify_google_id_token",
            side_effect=ValueError("bad token"),
        ):
            with TestClient(app) as client:
                res = client.post("/auth/google", json={"id_token": "bad-token"})

        assert res.status_code == 401
        assert "Invalid Google token" in res.json()["detail"]

    def test_google_registration_disabled_blocks_new_user(self):
        db = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = None
        app.dependency_overrides[get_db] = lambda: db

        with patch.object(settings, "registration_enabled", False):
            with TestClient(app) as client:
                res = self._post_google(client)

        assert res.status_code == 403
        assert "closed" in res.json()["detail"]


# ---------------------------------------------------------------------------
# GET /auth/me  (protected route)
# ---------------------------------------------------------------------------

class TestMe:
    def setup_method(self):
        _clear()

    def test_me_with_valid_token_returns_user(self):
        user = _make_user()
        db = _db_with(user=user)
        app.dependency_overrides[get_db] = lambda: db

        token = _valid_token(str(user.id))

        with TestClient(app) as client:
            res = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})

        assert res.status_code == 200
        body = res.json()
        assert body["email"] == user.email
        assert body["auth_provider"] == user.auth_provider

    def test_me_without_token_returns_401(self):
        with TestClient(app) as client:
            res = client.get("/auth/me")

        assert res.status_code == 401

    def test_me_with_invalid_token_returns_401(self):
        with TestClient(app) as client:
            res = client.get("/auth/me", headers={"Authorization": "Bearer bad.token.here"})

        assert res.status_code == 401

    def test_me_with_expired_token_returns_401(self):
        from datetime import timedelta

        past = datetime.now(timezone.utc) - timedelta(minutes=5)
        expired = jwt.encode(
            {"sub": str(uuid.uuid4()), "exp": past},
            settings.secret_key,
            algorithm=settings.algorithm,
        )
        with TestClient(app) as client:
            res = client.get("/auth/me", headers={"Authorization": f"Bearer {expired}"})

        assert res.status_code == 401

    def test_me_token_with_missing_sub_returns_401(self):
        from datetime import timedelta

        future = datetime.now(timezone.utc) + timedelta(minutes=60)
        token = jwt.encode(
            {"exp": future},  # no "sub"
            settings.secret_key,
            algorithm=settings.algorithm,
        )
        with TestClient(app) as client:
            res = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})

        assert res.status_code == 401

    def test_me_valid_token_user_not_in_db_returns_401(self):
        """Token is valid but user was deleted from DB."""
        db = _db_with(user=None)
        app.dependency_overrides[get_db] = lambda: db

        token = _valid_token(str(uuid.uuid4()))

        with TestClient(app) as client:
            res = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})

        assert res.status_code == 401
