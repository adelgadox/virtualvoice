import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, get_current_admin
from app.models.knowledge_entry import KnowledgeEntry
from app.models.user import User
from app.schemas.knowledge import KnowledgeEntryCreate, KnowledgeEntryOut, KnowledgeEntryUpdate
from app.utils.rate_limit import limiter
from app.core.personality._embed import try_embed

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/knowledge", tags=["knowledge"])


@router.get("/", response_model=list[KnowledgeEntryOut])
@limiter.limit("60/minute")
def list_entries(
    request: Request,
    influencer_id: UUID | None = None,
    category: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = db.query(KnowledgeEntry).filter(KnowledgeEntry.is_active == True)  # noqa: E712
    if influencer_id:
        query = query.filter(KnowledgeEntry.influencer_id == influencer_id)
    if category:
        query = query.filter(KnowledgeEntry.category == category)
    return query.order_by(KnowledgeEntry.created_at.desc()).all()


@router.post("/", response_model=KnowledgeEntryOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("30/minute")
def create_entry(request: Request, body: KnowledgeEntryCreate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    entry = KnowledgeEntry(**body.model_dump())
    entry.embedding = try_embed(body.content)
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.patch("/{entry_id}", response_model=KnowledgeEntryOut)
@limiter.limit("30/minute")
def update_entry(
    request: Request,
    entry_id: UUID,
    body: KnowledgeEntryUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    entry = db.query(KnowledgeEntry).filter(KnowledgeEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(entry, field, value)
    # Re-embed when content changes
    if body.content is not None:
        entry.embedding = try_embed(body.content)
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("30/minute")
def delete_entry(request: Request, entry_id: UUID, db: Session = Depends(get_db), _: User = Depends(get_current_admin)):
    entry = db.query(KnowledgeEntry).filter(KnowledgeEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    entry.is_active = False
    db.commit()
