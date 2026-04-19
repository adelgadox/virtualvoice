import hashlib
import hmac
import logging

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.core.meta.webhook_handler import handle_meta_webhook

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/webhooks", tags=["webhooks"])


def _verify_meta_signature(body: bytes, signature_header: str | None) -> bool:
    if not signature_header or not settings.meta_app_secret:
        return False
    expected = "sha256=" + hmac.new(
        settings.meta_app_secret.encode(), body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature_header)


@router.get("/meta")
def meta_webhook_verify(
    hub_mode: str | None = None,
    hub_challenge: str | None = None,
    hub_verify_token: str | None = None,
):
    """Meta webhook verification challenge."""
    if hub_mode == "subscribe" and hub_verify_token == settings.meta_webhook_verify_token:
        return Response(content=hub_challenge, media_type="text/plain")
    raise HTTPException(status_code=403, detail="Verification failed")


@router.post("/meta")
async def meta_webhook_event(request: Request, db: Session = Depends(get_db)):
    body = await request.body()
    signature = request.headers.get("X-Hub-Signature-256")

    if not _verify_meta_signature(body, signature):
        logger.warning("Invalid Meta webhook signature")
        raise HTTPException(status_code=403, detail="Invalid signature")

    payload = await request.json()
    handle_meta_webhook(payload, db)
    return {"status": "ok"}
