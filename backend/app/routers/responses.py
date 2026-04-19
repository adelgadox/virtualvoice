from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.comment import Comment
from app.models.influencer import Influencer
from app.models.pending_response import PendingResponse
from app.models.user import User
from app.schemas.response import ApproveRequest, PendingResponseOut

router = APIRouter(prefix="/responses", tags=["responses"])


@router.get("/pending", response_model=list[PendingResponseOut])
def list_pending(
    influencer_id: UUID | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = db.query(PendingResponse).filter(PendingResponse.status == "pending")
    if influencer_id:
        query = query.filter(PendingResponse.influencer_id == influencer_id)
    return query.order_by(PendingResponse.created_at.asc()).all()


@router.get("/history", response_model=list[PendingResponseOut])
def list_history(
    influencer_id: UUID | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = db.query(PendingResponse).filter(PendingResponse.status != "pending")
    if influencer_id:
        query = query.filter(PendingResponse.influencer_id == influencer_id)
    return query.order_by(PendingResponse.updated_at.desc()).limit(200).all()


@router.post("/{response_id}/approve", response_model=PendingResponseOut)
def approve_response(
    response_id: UUID,
    body: ApproveRequest,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    resp = db.query(PendingResponse).filter(PendingResponse.id == response_id, PendingResponse.status == "pending").first()
    if not resp:
        raise HTTPException(status_code=404, detail="Pending response not found")

    new_status = "edited" if body.final_text and body.final_text != resp.suggested_text else "approved"
    updated = PendingResponse(
        **{c.key: getattr(resp, c.key) for c in resp.__table__.columns},
        status=new_status,
        final_text=body.final_text or resp.suggested_text,
        approved_by=body.approved_by,
        approved_at=datetime.now(timezone.utc),
    )
    # Immutable update: expire old row, add new state
    resp.status = new_status
    resp.final_text = body.final_text or resp.suggested_text
    resp.approved_by = body.approved_by
    resp.approved_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(resp)
    return resp


@router.post("/{response_id}/ignore", response_model=PendingResponseOut)
def ignore_response(
    response_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    resp = db.query(PendingResponse).filter(PendingResponse.id == response_id, PendingResponse.status == "pending").first()
    if not resp:
        raise HTTPException(status_code=404, detail="Pending response not found")
    resp.status = "ignored"
    db.commit()
    db.refresh(resp)
    return resp


@router.post("/{response_id}/regenerate", response_model=PendingResponseOut)
def regenerate_response(
    response_id: UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    resp = db.query(PendingResponse).filter(PendingResponse.id == response_id, PendingResponse.status == "pending").first()
    if not resp:
        raise HTTPException(status_code=404, detail="Pending response not found")

    comment = db.query(Comment).filter(Comment.id == resp.comment_id).first()
    influencer = db.query(Influencer).filter(Influencer.id == resp.influencer_id).first()
    if not comment or not influencer:
        raise HTTPException(status_code=404, detail="Comment or influencer not found")

    from app.core.personality.engine import PersonalityEngine
    engine = PersonalityEngine(db)
    new_text = engine.generate(influencer=influencer, comment=comment)

    resp.suggested_text = new_text
    db.commit()
    db.refresh(resp)
    return resp
