from sqlalchemy import Column, String, DateTime, func
from app.database import Base


class TokenDenylist(Base):
    """Revoked JWT tokens — checked on every authenticated request until expiry."""

    __tablename__ = "token_denylist"

    jti = Column(String, primary_key=True, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
