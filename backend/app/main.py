import asyncio
import logging
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.gzip import GZipMiddleware
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

# Paths that must NOT be GZip-decompressed so HMAC signature checks work on raw bytes
_GZIP_EXCLUDE_PREFIXES = ("/webhooks/",)


class SelectiveGZipMiddleware:
    """GZipMiddleware that skips compression/decompression for excluded paths."""

    def __init__(self, app, minimum_size: int = 1000):
        self._gzip = GZipMiddleware(app, minimum_size=minimum_size)
        self._app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http" and any(
            scope.get("path", "").startswith(p) for p in _GZIP_EXCLUDE_PREFIXES
        ):
            await self._app(scope, receive, send)
        else:
            await self._gzip(scope, receive, send)

from app.config import settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    stream=sys.stdout,
)
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
logger = logging.getLogger(__name__)

from app.routers import auth, influencers, responses, knowledge, webhooks, social_accounts, metrics  # noqa: E402
from app.models import influencer as _influencer_model  # noqa: F401, E402
from app.models import social_account as _social_account_model  # noqa: F401, E402
from app.models import comment as _comment_model  # noqa: F401, E402
from app.models import pending_response as _pending_response_model  # noqa: F401, E402
from app.models import knowledge_entry as _knowledge_entry_model  # noqa: F401, E402
from app.models import user as _user_model  # noqa: F401, E402
from app.utils.rate_limit import limiter  # noqa: E402
from app.core.meta.token_renewal import token_renewal_loop  # noqa: E402


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        return response


@asynccontextmanager
async def lifespan(app: FastAPI):
    renewal_task = asyncio.create_task(token_renewal_loop())
    yield
    renewal_task.cancel()
    try:
        await renewal_task
    except asyncio.CancelledError:
        pass


import os
_railway_env = os.getenv("RAILWAY_ENVIRONMENT", "")
if _railway_env == "production" and settings.debug:
    raise RuntimeError(
        "DEBUG=true is not allowed in RAILWAY_ENVIRONMENT=production. "
        "Set DEBUG=false in your Railway environment variables."
    )

app = FastAPI(title=settings.app_name, debug=settings.debug, lifespan=lifespan)
app.state.limiter = limiter

if settings.debug:
    logger.warning(
        "FastAPI DEBUG mode is ON — full stack traces will be exposed in responses. "
        "Set DEBUG=false in production."
    )

app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(SelectiveGZipMiddleware, minimum_size=1000)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts=settings.trusted_proxy_ips)

_allowed_origins = [o.strip().rstrip("/") for o in settings.frontend_url.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)

app.include_router(auth.router)
app.include_router(influencers.router)
app.include_router(responses.router)
app.include_router(knowledge.router)
app.include_router(webhooks.router)
app.include_router(social_accounts.router)
app.include_router(metrics.router)


@app.get("/health")
def health():
    return {"status": "ok"}
