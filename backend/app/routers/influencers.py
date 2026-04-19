from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from app.database import get_db
from app.dependencies import get_current_user, get_current_admin
from app.models.influencer import Influencer
from app.models.user import User
from app.schemas.influencer import InfluencerCreate, InfluencerUpdate, InfluencerOut

router = APIRouter(prefix="/influencers", tags=["influencers"])


@router.get("/", response_model=list[InfluencerOut])
def list_influencers(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(Influencer).order_by(Influencer.name).all()


@router.post("/", response_model=InfluencerOut, status_code=status.HTTP_201_CREATED)
def create_influencer(body: InfluencerCreate, db: Session = Depends(get_db), _: User = Depends(get_current_admin)):
    if db.query(Influencer).filter(Influencer.slug == body.slug).first():
        raise HTTPException(status_code=400, detail="Slug already in use")
    influencer = Influencer(**body.model_dump())
    db.add(influencer)
    db.commit()
    db.refresh(influencer)
    return influencer


@router.get("/{influencer_id}", response_model=InfluencerOut)
def get_influencer(influencer_id: UUID, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    influencer = db.query(Influencer).filter(Influencer.id == influencer_id).first()
    if not influencer:
        raise HTTPException(status_code=404, detail="Influencer not found")
    return influencer


@router.patch("/{influencer_id}", response_model=InfluencerOut)
def update_influencer(
    influencer_id: UUID,
    body: InfluencerUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
):
    influencer = db.query(Influencer).filter(Influencer.id == influencer_id).first()
    if not influencer:
        raise HTTPException(status_code=404, detail="Influencer not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(influencer, field, value)
    db.commit()
    db.refresh(influencer)
    return influencer
