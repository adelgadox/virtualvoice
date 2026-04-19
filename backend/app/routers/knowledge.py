from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.knowledge_entry import KnowledgeEntry
from app.models.user import User
from app.schemas.knowledge import KnowledgeEntryCreate, KnowledgeEntryOut, KnowledgeEntryUpdate

router = APIRouter(prefix="/knowledge", tags=["knowledge"])


@router.get("/", response_model=list[KnowledgeEntryOut])
def list_entries(
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
def create_entry(body: KnowledgeEntryCreate, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    entry = KnowledgeEntry(**body.model_dump())
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.patch("/{entry_id}", response_model=KnowledgeEntryOut)
def update_entry(
    entry_id: UUID,
    body: KnowledgeEntryUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    entry = db.query(KnowledgeEntry).filter(KnowledgeEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(entry, field, value)
    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_entry(entry_id: UUID, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    entry = db.query(KnowledgeEntry).filter(KnowledgeEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Entry not found")
    entry.is_active = False
    db.commit()
