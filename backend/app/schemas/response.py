from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class PendingResponseOut(BaseModel):
    id: UUID
    comment_id: UUID
    influencer_id: UUID
    suggested_text: str
    final_text: str | None = None
    llm_provider_used: str | None = None
    status: str
    approved_by: str | None = None
    approved_at: datetime | None = None
    published_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ApproveRequest(BaseModel):
    final_text: str | None = None
    approved_by: str


class RegenerateRequest(BaseModel):
    pass
