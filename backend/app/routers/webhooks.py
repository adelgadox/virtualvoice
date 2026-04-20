import hashlib
import hmac
import logging

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.core.meta.webhook_handler import handle_meta_webhook
from app.utils.rate_limit import limiter

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/webhooks", tags=["webhooks"])


def _verify_meta_signature(body: bytes, signature_header: str | None) -> bool:
    if not signature_header or not settings.meta_app_secret:
        logger.warning("Missing signature header or app secret (header=%s, secret_len=%d)", signature_header, len(settings.meta_app_secret))
        return False
    expected = "sha256=" + hmac.new(
        settings.meta_app_secret.encode(), body, hashlib.sha256
    ).hexdigest()
    logger.warning("Signature check — secret_repr=%r expected=%s received=%s", settings.meta_app_secret[:8], expected, signature_header)
    return hmac.compare_digest(expected, signature_header)


@router.get("/meta")
@limiter.limit("20/minute")
def meta_webhook_verify(
    request: Request,
    hub_mode: str | None = Query(default=None, alias="hub.mode"),
    hub_challenge: str | None = Query(default=None, alias="hub.challenge"),
    hub_verify_token: str | None = Query(default=None, alias="hub.verify_token"),
):
    """Meta webhook verification challenge (hub.mode / hub.challenge / hub.verify_token)."""
    if hub_mode == "subscribe" and hub_verify_token == settings.meta_webhook_verify_token:
        return Response(content=hub_challenge, media_type="text/plain")
    raise HTTPException(status_code=403, detail="Verification failed")


@router.post("/meta")
@limiter.limit("300/minute")
async def meta_webhook_event(request: Request, db: Session = Depends(get_db)):
    body = await request.body()
    signature = request.headers.get("X-Hub-Signature-256")

    if not _verify_meta_signature(body, signature):
        logger.warning("Invalid Meta webhook signature")
        raise HTTPException(status_code=403, detail="Invalid signature")

    payload = await request.json()
    await handle_meta_webhook(payload, db)
    return {"status": "ok"}
