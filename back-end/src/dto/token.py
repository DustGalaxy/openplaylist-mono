from pydantic import BaseModel


class CodeDTO(BaseModel):
    code: str


class AccessToken(BaseModel):
    access_token: str


class OAuthBody(BaseModel):
    code: str
    code_verifier: str | None = None


class UserKeyBody(BaseModel):
    user_key: str


