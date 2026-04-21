from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models.user import User
from app.schemas.auth import (
    GoogleAuthRequest,
    LoginRequest,
    RegisterRequest,
    TokenOut,
    UserOut,
)
from app.dependencies import get_current_user
from app.utils.rate_limit import limiter

router = APIRouter(prefix="/auth", tags=["auth"])


def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def _verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def _create_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    return jwt.encode({"sub": user_id, "exp": expire}, settings.secret_key, algorithm=settings.algorithm)


@router.post("/register", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/hour")
def register(request: Request, body: RegisterRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == body.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(
        email=body.email,
        hashed_password=_hash_password(body.password),
        full_name=body.full_name,
        auth_provider="credentials",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return TokenOut(access_token=_create_token(str(user.id)))


@router.post("/login", response_model=TokenOut)
@limiter.limit("10/minute")
def login(request: Request, body: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email, User.is_active == True).first()  # noqa: E712
    if not user or not user.hashed_password or not _verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    return TokenOut(access_token=_create_token(str(user.id)))


@router.post("/google", response_model=TokenOut)
@limiter.limit("20/minute")
def google_auth(request: Request, body: GoogleAuthRequest, db: Session = Depends(get_db)):
    # Verify the Google ID token server-side — never trust client-supplied identity claims
    try:
        from google.oauth2 import id_token as google_id_token
        from google.auth.transport import requests as google_requests

        idinfo = google_id_token.verify_oauth2_token(
            body.id_token,
            google_requests.Request(),
            settings.google_client_id,
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google token",
        )

    google_id: str = idinfo["sub"]
    email: str = idinfo["email"]
    full_name: str | None = idinfo.get("name")
    avatar_url: str | None = idinfo.get("picture")

    # Find existing user by google_id or email
    user = db.query(User).filter(User.google_id == google_id).first()

    if not user:
        user = db.query(User).filter(User.email == email).first()

    if user:
        changed = False
        if not user.google_id:
            user.google_id = google_id
            user.auth_provider = "google"
            changed = True
        if avatar_url and not user.avatar_url:
            user.avatar_url = avatar_url
            changed = True
        if changed:
            db.commit()
            db.refresh(user)
    else:
        user = User(
            email=email,
            full_name=full_name,
            avatar_url=avatar_url,
            google_id=google_id,
            auth_provider="google",
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account disabled")

    return TokenOut(access_token=_create_token(str(user.id)))


@router.get("/me", response_model=UserOut)
@limiter.limit("60/minute")
def me(request: Request, current_user: User = Depends(get_current_user)):
    return current_user
