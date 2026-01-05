from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from _types import Platform
from models.linked_accounts import LinkedAccountsDomain


class AuthUserDomain(BaseModel):
    id: UUID

    last_login: datetime
    username: str
    main_platform: Platform
    linked_accounts: list[LinkedAccountsDomain]

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AuthUserCreate(BaseModel):
    last_login: datetime = Field(default_factory=datetime.now)
    username: str
    main_platform: Platform


class AuthUserUpdate(BaseModel):
    last_login: datetime | None = None
    username: str | None = None
    main_platform: Platform | None = None
