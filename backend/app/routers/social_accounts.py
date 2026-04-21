import json
import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models.influencer import Influencer
from app.models.social_account import SocialAccount
from app.models.user import User
from app.schemas.social_account import SocialAccountOut
from app.utils.rate_limit import limiter
from app.core.meta.oauth import (
    build_auth_url,
    exchange_code,
    get_long_lived_token,
    get_instagram_accounts,
    sign_state,
    verify_state,
)
from app.core.meta.token_manager import compute_token_expiry

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/social-accounts", tags=["social-accounts"])


@router.get("/", response_model=list[SocialAccountOut])
@limiter.limit("60/minute")
def list_social_accounts(
    request: Request,
    influencer_id: UUID | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = db.query(SocialAccount).filter(SocialAccount.is_active == True)  # noqa: E712
    if influencer_id:
        query = query.filter(SocialAccount.influencer_id == influencer_id)
    return query.order_by(SocialAccount.created_at.desc()).all()


@router.get("/instagram/authorize")
@limiter.limit("20/minute")
def instagram_authorize(
    request: Request,
    influencer_id: UUID,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return the Meta OAuth URL to redirect the user to."""
    influencer = db.query(Influencer).filter(Influencer.id == influencer_id).first()
    if not influencer:
        raise HTTPException(status_code=404, detail="Influencer not found")

    # State encodes influencer_id + HMAC to prevent CSRF
    state_payload = json.dumps({"influencer_id": str(influencer_id)})
    signature = sign_state(state_payload)
    state = f"{state_payload}|{signature}"

    return {"url": build_auth_url(state)}


@router.get("/instagram/callback")
async def instagram_callback(
    code: str | None = Query(default=None),
    state: str | None = Query(default=None),
    error: str | None = Query(default=None),
    db: Session = Depends(get_db),
):
    """
    Meta redirects here after the user authorizes.
    Exchanges the code for a token, fetches the Instagram account, saves it.
    Redirects to frontend with ?success=true or ?error=...
    """
    frontend = settings.frontend_url.split(",")[0].strip().rstrip("/")
    redirect_base = f"{frontend}/dashboard/influencers"

    if error:
        logger.warning("Instagram OAuth error: %s", error)
        return RedirectResponse(f"{redirect_base}?oauth_error={error}")

    if not code or not state:
        return RedirectResponse(f"{redirect_base}?oauth_error=missing_params")

    # Verify state
    try:
        parts = state.rsplit("|", 1)
        if len(parts) != 2:
            raise ValueError("Invalid state format")
        state_payload, signature = parts
        if not verify_state(state_payload, signature):
            raise ValueError("State signature mismatch")
        state_data = json.loads(state_payload)
        influencer_id = UUID(state_data["influencer_id"])
    except Exception as exc:
        logger.warning("Invalid OAuth state: %s", exc)
        return RedirectResponse(f"{redirect_base}?oauth_error=invalid_state")

    influencer = db.query(Influencer).filter(Influencer.id == influencer_id).first()
    if not influencer:
        return RedirectResponse(f"{redirect_base}?oauth_error=influencer_not_found")

    try:
        short_token = await exchange_code(code)
        long_token = await get_long_lived_token(short_token)
        ig_accounts = await get_instagram_accounts(long_token)
    except Exception as exc:
        logger.exception("Failed to exchange Instagram OAuth code: %s", exc)
        return RedirectResponse(f"{redirect_base}?oauth_error=token_exchange_failed")

    if not ig_accounts:
        return RedirectResponse(f"{redirect_base}?oauth_error=no_instagram_account")

    saved = 0
    for account in ig_accounts:
        existing = db.query(SocialAccount).filter(
            SocialAccount.account_id == account["account_id"],
            SocialAccount.influencer_id == influencer_id,
        ).first()

        token_expires_at = compute_token_expiry()
        if existing:
            existing.access_token = account["page_access_token"]
            existing.token_expires_at = token_expires_at
            existing.username = account["username"]
            existing.page_id = account["page_id"]
            existing.profile_picture_url = account.get("profile_picture_url")
            existing.is_active = True
        else:
            db.add(SocialAccount(
                influencer_id=influencer_id,
                platform="instagram",
                account_id=account["account_id"],
                page_id=account["page_id"],
                username=account["username"],
                profile_picture_url=account.get("profile_picture_url"),
                access_token=account["page_access_token"],
                token_expires_at=token_expires_at,
            ))
        saved += 1

    db.commit()
    logger.info("Saved %d Instagram account(s) for influencer %s", saved, influencer_id)
    return RedirectResponse(f"{redirect_base}?oauth_success=true&influencer_id={influencer_id}")


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("20/minute")
def disconnect_social_account(
    request: Request,
    account_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    account = db.query(SocialAccount).filter(SocialAccount.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Social account not found")
    account.is_active = False
    db.commit()
