import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_admin, get_current_superadmin
from app.models.influencer import Influencer
from app.models.user import User
from app.schemas.studio import (
    InviteUserRequest,
    StudioStats,
    StudioUser,
    UpdateRoleRequest,
    UpdateStatusRequest,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/studio", tags=["studio"])


@router.get("/stats", response_model=StudioStats)
def get_stats(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
) -> StudioStats:
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_active == True).count()  # noqa: E712
    total_influencers = db.query(Influencer).count()
    active_influencers = db.query(Influencer).filter(Influencer.is_active == True).count()  # noqa: E712
    return StudioStats(
        total_users=total_users,
        active_users=active_users,
        total_influencers=total_influencers,
        active_influencers=active_influencers,
    )


@router.get("/users", response_model=list[StudioUser])
def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin),
) -> list[User]:
    return db.query(User).order_by(User.created_at.desc()).all()


@router.post("/users", response_model=StudioUser, status_code=status.HTTP_201_CREATED)
def invite_user(
    body: InviteUserRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superadmin),
) -> User:
    existing = db.query(User).filter(User.email == body.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")
    user = User(
        email=body.email,
        role=body.role,
        auth_provider="google",  # invited users must sign in via Google SSO
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    logger.info("Superadmin %s invited user %s with role %s", current_user.email, user.email, user.role)
    return user


@router.patch("/users/{user_id}/role", status_code=status.HTTP_200_OK)
def update_user_role(
    user_id: str,
    body: UpdateRoleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_superadmin),
) -> dict:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if str(user.id) == str(current_user.id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot change your own role")
    user.role = body.role
    db.commit()
    logger.info("Superadmin %s changed role of user %s to %s", current_user.email, user.email, body.role)
    return {"ok": True}


@router.patch("/users/{user_id}/status", status_code=status.HTTP_200_OK)
def update_user_status(
    user_id: str,
    body: UpdateStatusRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin),
) -> dict:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if str(user.id) == str(current_user.id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot change your own status")
    # Admins cannot suspend other admins/superadmins — only superadmin can
    if user.role in ("admin", "superadmin") and current_user.role != "superadmin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superadmin required to modify admin accounts",
        )
    user.is_active = body.is_active
    db.commit()
    logger.info(
        "Admin %s set is_active=%s for user %s", current_user.email, body.is_active, user.email
    )
    return {"ok": True}
