from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class InfluencerBase(BaseModel):
    name: str
    slug: str
    llm_provider: str | None = None
    system_prompt_core: str = ""
    current_context: str | None = None
    is_active: bool = True


class InfluencerCreate(InfluencerBase):
    pass


class InfluencerUpdate(BaseModel):
    name: str | None = None
    llm_provider: str | None = None
    system_prompt_core: str | None = None
    current_context: str | None = None
    is_active: bool | None = None


class InfluencerOut(InfluencerBase):
    id: UUID
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}
