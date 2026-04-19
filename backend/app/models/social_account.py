from sqlalchemy import Column, String, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
import uuid
from app.database import Base


class SocialAccount(Base):
    __tablename__ = "social_accounts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    influencer_id = Column(UUID(as_uuid=True), ForeignKey("influencers.id"), nullable=False, index=True)
    # instagram | facebook | threads
    platform = Column(String, nullable=False)
    account_id = Column(String, nullable=False)
    page_id = Column(String, nullable=True)
    access_token = Column(String, nullable=True)
    token_expires_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
