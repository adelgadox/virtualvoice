from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import UUID
import uuid
from app.database import Base


class Comment(Base):
    __tablename__ = "comments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    social_account_id = Column(UUID(as_uuid=True), ForeignKey("social_accounts.id"), nullable=False, index=True)
    # ID of the comment on the platform (e.g. Meta comment ID)
    platform_comment_id = Column(String, nullable=False, unique=True, index=True)
    author_username = Column(String, nullable=True)
    author_platform_id = Column(String, nullable=True)
    content = Column(Text, nullable=False)
    # The post this comment was left on
    post_id = Column(String, nullable=True)
    post_content = Column(Text, nullable=True)
    received_at = Column(DateTime(timezone=True), server_default=func.now())
    # True once a pending_response has been created for this comment
    processed = Column(Boolean, default=False)
