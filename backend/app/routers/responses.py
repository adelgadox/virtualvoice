from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.comment import Comment
from app.models.influencer import Influencer
from app.models.knowledge_entry import KnowledgeEntry
from app.models.pending_response import PendingResponse
from app.models.social_account import SocialAccount
from app.models.user import User
from app.schemas.response import ApproveRequest, PendingResponseOut
from app.utils.rate_limit import limiter
from app.core.personality._embed import try_embed

router = APIRouter(prefix="/responses", tags=["responses"])


def _save_voice_example(db: Session, influencer_id: UUID, comment: Comment, response_text: str) -> None:
    """Persist an approved/edited response as a voice_examples knowledge entry."""
    content = f"Comment: {comment.content}\nResponse: {response_text}"
    entry = KnowledgeEntry(
        influencer_id=influencer_id,
        category="voice_examples",
        content=content,
        embedding=try_embed(content),
    )
    db.add(entry)


def _enrich(resp: PendingResponse, db: Session) -> PendingResponseOut:
    """Attach comment content/author to the response DTO."""
    comment = db.query(Comment).filter(Comment.id == resp.comment_id).first()
    out = PendingResponseOut.model_validate(resp)
    if comment:
        out.comment_content = comment.content
        out.comment_author = comment.author_username
    return out


@router.get("/pending", response_model=list[PendingResponseOut])
@limiter.limit("60/minute")
def list_pending(
    request: Request,
    influencer_id: UUID | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = db.query(PendingResponse).filter(PendingResponse.status == "pending")
    if influencer_id:
        query = query.filter(PendingResponse.influencer_id == influencer_id)
    rows = query.order_by(PendingResponse.created_at.asc()).all()
    return [_enrich(r, db) for r in rows]


@router.get("/history", response_model=list[PendingResponseOut])
@limiter.limit("60/minute")
def list_history(
    request: Request,
    influencer_id: UUID | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = db.query(PendingResponse).filter(PendingResponse.status != "pending")
    if influencer_id:
        query = query.filter(PendingResponse.influencer_id == influencer_id)
    return query.order_by(PendingResponse.updated_at.desc()).limit(200).all()


@router.post("/{response_id}/approve", response_model=PendingResponseOut)
@limiter.limit("30/minute")
async def approve_response(
    request: Request,
    response_id: UUID,
    body: ApproveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    resp = db.query(PendingResponse).filter(
        PendingResponse.id == response_id,
        PendingResponse.status == "pending",
    ).first()
    if not resp:
        raise HTTPException(status_code=404, detail="Pending response not found")

    final_text = body.final_text or resp.suggested_text
    new_status = "edited" if body.final_text and body.final_text != resp.suggested_text else "approved"

    # Publish to Meta when the social account has a token
    platform_reply_id: str | None = None
    published_at: datetime | None = None

    comment = db.query(Comment).filter(Comment.id == resp.comment_id).first()
    if comment:
        social_account = db.query(SocialAccount).filter(
            SocialAccount.id == comment.social_account_id
        ).first()
        if social_account and social_account.access_token:
            from app.core.meta.graph_api import publish_reply
            from app.core.meta.token_manager import get_valid_token, TokenInvalidError
            try:
                access_token = await get_valid_token(social_account, db)
                platform_reply_id = await publish_reply(
                    comment_id=comment.platform_comment_id,
                    message=final_text,
                    access_token=access_token,
                )
                published_at = datetime.now(timezone.utc)
            except TokenInvalidError as exc:
                raise HTTPException(status_code=401, detail=str(exc)) from exc
            except Exception as exc:
                raise HTTPException(
                    status_code=502,
                    detail=f"Failed to publish reply to Meta: {exc}",
                ) from exc

    resp.status = new_status
    resp.final_text = final_text
    resp.approved_by = current_user.email
    resp.approved_at = datetime.now(timezone.utc)
    resp.platform_reply_id = platform_reply_id
    resp.published_at = published_at

    # Feedback loop: save as voice_examples to improve future RAG results
    if comment:
        _save_voice_example(db, influencer_id=resp.influencer_id, comment=comment, response_text=final_text)

    db.commit()
    db.refresh(resp)
    return resp


@router.post("/{response_id}/ignore", response_model=PendingResponseOut)
@limiter.limit("60/minute")
def ignore_response(
    request: Request,
    response_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    resp = db.query(PendingResponse).filter(
        PendingResponse.id == response_id,
        PendingResponse.status == "pending",
    ).first()
    if not resp:
        raise HTTPException(status_code=404, detail="Pending response not found")
    resp.status = "ignored"
    db.commit()
    db.refresh(resp)
    return resp


@router.post("/{response_id}/regenerate", response_model=PendingResponseOut)
@limiter.limit("10/minute")
async def regenerate_response(
    request: Request,
    response_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    resp = db.query(PendingResponse).filter(
        PendingResponse.id == response_id,
        PendingResponse.status == "pending",
    ).first()
    if not resp:
        raise HTTPException(status_code=404, detail="Pending response not found")

    comment = db.query(Comment).filter(Comment.id == resp.comment_id).first()
    influencer = db.query(Influencer).filter(Influencer.id == resp.influencer_id).first()
    if not comment or not influencer:
        raise HTTPException(status_code=404, detail="Comment or influencer not found")

    from app.core.personality.engine import PersonalityEngine
    engine = PersonalityEngine(db)
    resp.suggested_text = await engine.generate(influencer=influencer, comment=comment)
    db.commit()
    db.refresh(resp)
    return resp
