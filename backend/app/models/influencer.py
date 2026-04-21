from sqlalchemy import Column, String, Boolean, DateTime, Text, func
from sqlalchemy.dialects.postgresql import UUID
import uuid
from app.database import Base


class Influencer(Base):
    __tablename__ = "influencers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, nullable=False, index=True)
    # Which LLM provider to use for this influencer (overrides global default)
    llm_provider = Column(String, nullable=True)
    # Core system prompt defining personality, tone, identity
    system_prompt_core = Column(Text, nullable=False, default="")
    # Situational context: free-text note injected into each prompt (mood, events, etc.)
    current_context = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
