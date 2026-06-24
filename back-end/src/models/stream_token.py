from uuid import UUID

from pydantic import BaseModel, ConfigDict


class StreamTokenSchema(BaseModel):
    user_id: UUID
    token_hash: str

    model_config = ConfigDict(from_attributes=True)


class StreamTokenCreate(BaseModel):
    user_id: UUID
    token_hash: str


class StreamTokenPatch(BaseModel):
    token_hash: str
