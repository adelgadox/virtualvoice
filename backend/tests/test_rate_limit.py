"""
Unit tests for the rate limiter's Redis URL helper.

`_with_fast_timeout` injects socket timeouts into the Redis URL so that an
unreachable Redis fails fast instead of stalling every rate-limited route.
The limiter runs with swallow_errors=True, so a timeout degrades to a skipped
rate limit rather than a request error — which makes the timeout value itself
the only thing standing between a Redis outage and a multi-second response.
"""
from urllib.parse import parse_qs, urlparse

from app.utils.rate_limit import _with_fast_timeout, get_client_ip


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _timeouts(url: str) -> tuple[str | None, str | None]:
    """Extract (socket_connect_timeout, socket_timeout) from a Redis URL."""
    params = parse_qs(urlparse(url).query, keep_blank_values=True)
    connect = params.get("socket_connect_timeout", [None])[0]
    socket = params.get("socket_timeout", [None])[0]
    return connect, socket


# ---------------------------------------------------------------------------
# Default timeout
# ---------------------------------------------------------------------------

def test_injects_both_timeouts_by_default():
    connect, socket = _timeouts(_with_fast_timeout("redis://localhost:6379"))
    assert connect == "0.1"
    assert socket == "0.1"


def test_default_is_fast_enough_to_stay_imperceptible():
    """A stalled Redis must not add a perceptible delay to a rate-limited route."""
    connect, socket = _timeouts(_with_fast_timeout("redis://localhost:6379"))
    assert float(connect) <= 0.1
    assert float(socket) <= 0.1


def test_accepts_explicit_sub_second_timeout():
    """The parameter is a float — an int-only annotation would floor 0.25 to 0."""
    connect, socket = _timeouts(_with_fast_timeout("redis://localhost:6379", seconds=0.25))
    assert connect == "0.25"
    assert socket == "0.25"


# ---------------------------------------------------------------------------
# URL preservation
# ---------------------------------------------------------------------------

def test_preserves_scheme_host_port_and_credentials():
    result = _with_fast_timeout("redis://user:pass@redis.railway.internal:6379/2")
    parsed = urlparse(result)

    assert parsed.scheme == "redis"
    assert parsed.hostname == "redis.railway.internal"
    assert parsed.port == 6379
    assert parsed.username == "user"
    assert parsed.password == "pass"
    assert parsed.path == "/2"


def test_preserves_tls_scheme():
    assert _with_fast_timeout("rediss://redis.example.com:6380").startswith("rediss://")


def test_keeps_unrelated_query_params():
    result = _with_fast_timeout("redis://localhost:6379?ssl_cert_reqs=required")
    params = parse_qs(urlparse(result).query)

    assert params["ssl_cert_reqs"] == ["required"]
    assert params["socket_timeout"] == ["0.1"]


# ---------------------------------------------------------------------------
# Caller-supplied values win
# ---------------------------------------------------------------------------

def test_does_not_override_timeouts_already_in_the_url():
    """setdefault semantics — an operator pinning a timeout in REDIS_URL keeps it."""
    connect, socket = _timeouts(
        _with_fast_timeout("redis://localhost:6379?socket_timeout=5&socket_connect_timeout=3")
    )
    assert connect == "3"
    assert socket == "5"


def test_fills_only_the_missing_timeout():
    connect, socket = _timeouts(_with_fast_timeout("redis://localhost:6379?socket_timeout=5"))
    assert connect == "0.1"
    assert socket == "5"


# ---------------------------------------------------------------------------
# Idempotency
# ---------------------------------------------------------------------------

def test_is_idempotent():
    once = _with_fast_timeout("redis://localhost:6379")
    assert _with_fast_timeout(once) == once


# ---------------------------------------------------------------------------
# get_client_ip
# ---------------------------------------------------------------------------

class _FakeClient:
    def __init__(self, host: str) -> None:
        self.host = host


class _FakeRequest:
    def __init__(self, client: _FakeClient | None) -> None:
        self.client = client


def test_client_ip_read_from_request_client():
    assert get_client_ip(_FakeRequest(_FakeClient("203.0.113.7"))) == "203.0.113.7"


def test_client_ip_falls_back_when_client_is_missing():
    assert get_client_ip(_FakeRequest(None)) == "unknown"
