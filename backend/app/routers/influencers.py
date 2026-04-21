from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user, get_current_admin
from app.models.influencer import Influencer
from app.models.user import User
from app.schemas.influencer import InfluencerCreate, InfluencerUpdate, InfluencerOut
from app.utils.rate_limit import limiter

router = APIRouter(prefix="/influencers", tags=["influencers"])


@router.get("/", response_model=list[InfluencerOut])
@limiter.limit("60/minute")
def list_influencers(request: Request, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.query(Influencer).order_by(Influencer.name).limit(200).all()


@router.post("/", response_model=InfluencerOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("20/minute")
def create_influencer(request: Request, body: InfluencerCreate, db: Session = Depends(get_db), _: User = Depends(get_current_admin)):
    if db.query(Influencer).filter(Influencer.slug == body.slug).first():
        raise HTTPException(status_code=400, detail="Slug already in use")
    influencer = Influencer(**body.model_dump())
    db.add(influencer)
    db.commit()
    db.refresh(influencer)
    return influencer


@router.get("/{influencer_id}", response_model=InfluencerOut)
@limiter.limit("60/minute")
def get_influencer(request: Request, influencer_id: UUID, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    influencer = db.query(Influencer).filter(Influencer.id == influencer_id).first()
    if not influencer:
        raise HTTPException(status_code=404, detail="Influencer not found")
    return influencer


@router.patch("/{influencer_id}", response_model=InfluencerOut)
@limiter.limit("20/minute")
def update_influencer(
    request: Request,
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
