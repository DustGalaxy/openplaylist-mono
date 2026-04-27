from typing import TypedDict


class PlatformUser(TypedDict):
    id: str

    username: str
    avatar_url: str

    email: str
    email_verified: bool

    access_token: str
    refresh_token: str
    expires_at: int
