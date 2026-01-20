from datetime import datetime

from pydantic import BaseModel, ConfigDict


class User(BaseModel):
    da_id: str
    id: str

    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserCreate(BaseModel):
    da_id: str
    id: str


class UserPatch(BaseModel):
    pass
