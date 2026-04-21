from pydantic import BaseModel, field_validator
from uuid import UUID
from datetime import datetime

from app.utils.sanitize import strip_html


class KnowledgeEntryBase(BaseModel):
    category: str
    content: str
    is_active: bool = True

    @field_validator("content", mode="before")
    @classmethod
    def sanitize_content(cls, v: str) -> str:
        return strip_html(v)


class KnowledgeEntryCreate(KnowledgeEntryBase):
    influencer_id: UUID


class KnowledgeEntryUpdate(BaseModel):
    category: str | None = None
    content: str | None = None
    is_active: bool | None = None

    @field_validator("content", mode="before")
    @classmethod
    def sanitize_content(cls, v: str | None) -> str | None:
        return strip_html(v) if v else v


class KnowledgeEntryOut(KnowledgeEntryBase):
    id: UUID
    influencer_id: UUID
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}
