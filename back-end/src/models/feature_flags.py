from uuid import UUID

from pydantic import BaseModel, ConfigDict


class FeatureFlagSchema(BaseModel):
    id: UUID
    key: str

    min_tier: int
    scope: str

    label: str
    is_enabled: bool

    model_config = ConfigDict(from_attributes=True)


class FeatureFlagPatch(BaseModel):
    min_tier: int

    label: str
    is_enabled: bool

    model_config = ConfigDict(from_attributes=True)


class FeatureFlagCreate(BaseModel):
    key: str

    min_tier: int
    scope: str

    label: str

    model_config = ConfigDict(from_attributes=True)
