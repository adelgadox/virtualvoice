from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class StudioStats(BaseModel):
    total_users: int
    active_users: int
    total_influencers: int
    active_influencers: int


class StudioUser(BaseModel):
    id: str
    email: str
    full_name: str | None = None
    avatar_url: str | None = None
    auth_provider: str
    role: str
    is_active: bool
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class UpdateRoleRequest(BaseModel):
    role: Literal["user", "admin", "superadmin"]


class UpdateStatusRequest(BaseModel):
    is_active: bool
