from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class KnowledgeEntryBase(BaseModel):
    category: str
    content: str
    is_active: bool = True


class KnowledgeEntryCreate(KnowledgeEntryBase):
    influencer_id: UUID


class KnowledgeEntryUpdate(BaseModel):
    category: str | None = None
    content: str | None = None
    is_active: bool | None = None


class KnowledgeEntryOut(KnowledgeEntryBase):
    id: UUID
    influencer_id: UUID
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}
