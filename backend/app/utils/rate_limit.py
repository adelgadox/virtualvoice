import logging
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

from fastapi import Request
from slowapi import Limiter

logger = logging.getLogger(__name__)


def get_client_ip(request: Request) -> str:
    """Real visitor IP — ProxyHeadersMiddleware already resolves X-Forwarded-For into request.client.host."""
    if request.client:
        return request.client.host
    return "unknown"


def _with_fast_timeout(url: str, seconds: int = 2) -> str:
    """Inject socket_connect_timeout and socket_timeout into a Redis URL so failures are fast."""
    parsed = urlparse(url)
    params = parse_qs(parsed.query, keep_blank_values=True)
    params.setdefault("socket_connect_timeout", [str(seconds)])
    params.setdefault("socket_timeout", [str(seconds)])
    new_query = urlencode({k: v[0] for k, v in params.items()})
    return urlunparse(parsed._replace(query=new_query))


def _make_limiter() -> Limiter:
    from app.config import settings

    if settings.redis_url:
        storage_uri = _with_fast_timeout(settings.redis_url)
        logger.info("Rate limiter using Redis storage: %s", settings.redis_url)
        return Limiter(key_func=get_client_ip, storage_uri=storage_uri, swallow_errors=True, headers_enabled=False)

    logger.warning(
        "REDIS_URL not set — rate limiter using in-memory storage. "
        "Rate limits are NOT shared across replicas. Set REDIS_URL in production."
    )
    return Limiter(key_func=get_client_ip)


limiter = _make_limiter()
