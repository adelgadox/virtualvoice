from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class SocialAccountOut(BaseModel):
    id: UUID
    influencer_id: UUID
    platform: str
    account_id: str
    page_id: str | None
    username: str | None
    profile_picture_url: str | None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class SocialAccountCreate(BaseModel):
    influencer_id: UUID
    platform: str
    account_id: str
    page_id: str | None = None
    username: str | None = None
    access_token: str
