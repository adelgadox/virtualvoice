from typing import Literal
from pydantic import BaseModel, field_validator
from uuid import UUID
from datetime import datetime

from app.utils.sanitize import strip_html, validate_slug


_LLM_PROVIDER = Literal["gemini", "anthropic", "openai", "deepseek"]


class InfluencerBase(BaseModel):
    name: str
    slug: str
    llm_provider: _LLM_PROVIDER | None = None
    system_prompt_core: str = ""
    current_context: str | None = None
    is_active: bool = True

    @field_validator("name", mode="before")
    @classmethod
    def sanitize_name(cls, v: str) -> str:
        return strip_html(v)

    @field_validator("slug", mode="before")
    @classmethod
    def sanitize_slug(cls, v: str) -> str:
        return validate_slug(v)

    @field_validator("system_prompt_core", mode="before")
    @classmethod
    def sanitize_prompt(cls, v: str) -> str:
        return strip_html(v)

    @field_validator("current_context", mode="before")
    @classmethod
    def sanitize_context(cls, v: str | None) -> str | None:
        return strip_html(v) if v else v


class InfluencerCreate(InfluencerBase):
    pass


class InfluencerUpdate(BaseModel):
    name: str | None = None
    llm_provider: _LLM_PROVIDER | None = None
    system_prompt_core: str | None = None
    current_context: str | None = None
    is_active: bool | None = None

    @field_validator("name", mode="before")
    @classmethod
    def sanitize_name(cls, v: str | None) -> str | None:
        return strip_html(v) if v else v

    @field_validator("system_prompt_core", mode="before")
    @classmethod
    def sanitize_prompt(cls, v: str | None) -> str | None:
        return strip_html(v) if v else v

    @field_validator("current_context", mode="before")
    @classmethod
    def sanitize_context(cls, v: str | None) -> str | None:
        return strip_html(v) if v else v


class InfluencerOut(InfluencerBase):
    id: UUID
    created_at: datetime
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}
