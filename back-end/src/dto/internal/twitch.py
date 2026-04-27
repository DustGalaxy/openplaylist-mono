from pydantic import BaseModel, Field


class TwitchAuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    expires_in: int
    scope: list[str] = Field(default_factory=list)
    token_type: str


class TwitchUserResponse(BaseModel):
    id: str
    login: str
    display_name: str
    email: str
    email_verified: bool
    type: str
    broadcaster_type: str
    description: str
    profile_image_url: str
    offline_image_url: str
    view_count: int

    created_at: str
