import logging

from fastapi import Request
from slowapi import Limiter

logger = logging.getLogger(__name__)


def get_client_ip(request: Request) -> str:
    """Real visitor IP — ProxyHeadersMiddleware already resolves X-Forwarded-For into request.client.host."""
    if request.client:
        return request.client.host
    return "unknown"


def _make_limiter() -> Limiter:
    from app.config import settings

    if settings.redis_url:
        logger.info("Rate limiter using Redis storage: %s", settings.redis_url)
        return Limiter(key_func=get_client_ip, storage_uri=settings.redis_url)

    logger.warning(
        "REDIS_URL not set — rate limiter using in-memory storage. "
        "Rate limits are NOT shared across replicas. Set REDIS_URL in production."
    )
    return Limiter(key_func=get_client_ip)


limiter = _make_limiter()
