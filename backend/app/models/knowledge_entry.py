from sqlalchemy import Column, String, Boolean, DateTime, Text, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID
import uuid
from app.database import Base

# pgvector type — loaded lazily so the extension is only required at runtime
try:
    from pgvector.sqlalchemy import Vector  # type: ignore
    _VECTOR_TYPE = Vector(1536)
except ImportError:
    from sqlalchemy import LargeBinary
    _VECTOR_TYPE = LargeBinary  # fallback for environments without pgvector


class KnowledgeEntry(Base):
    __tablename__ = "knowledge_entries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    influencer_id = Column(UUID(as_uuid=True), ForeignKey("influencers.id"), nullable=False, index=True)
    # biography | opinions | voice_examples | off_limits | brand_relationships | situational_context
    category = Column(String, nullable=False, index=True)
    content = Column(Text, nullable=False)
    # pgvector embedding (1536 dims = text-embedding-3-small / Gemini text-embedding-004)
    embedding = Column(_VECTOR_TYPE, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
