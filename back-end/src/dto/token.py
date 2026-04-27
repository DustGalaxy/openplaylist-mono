from pydantic import BaseModel


class CodeDTO(BaseModel):
    code: str


class AccessToken(BaseModel):
    access_token: str
