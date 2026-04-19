from sqlalchemy import Column, String, DateTime, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import UUID
import uuid
from app.database import Base


class PendingResponse(Base):
    __tablename__ = "pending_responses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    comment_id = Column(UUID(as_uuid=True), ForeignKey("comments.id"), nullable=False, index=True)
    influencer_id = Column(UUID(as_uuid=True), ForeignKey("influencers.id"), nullable=False, index=True)
    # AI-generated response
    suggested_text = Column(Text, nullable=False)
    # Final text after human editing (same as suggested_text if approved without edits)
    final_text = Column(Text, nullable=True)
    llm_provider_used = Column(String, nullable=True)
    # pending | approved | edited | rejected | ignored
    status = Column(String, nullable=False, default="pending", index=True)
    approved_by = Column(String, nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    published_at = Column(DateTime(timezone=True), nullable=True)
    # ID of the reply as returned by Meta Graph API
    platform_reply_id = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
