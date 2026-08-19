from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class GoogleTokenResponseDTO(BaseModel):
    """DTO для ответа от https://oauth2.googleapis.com/token"""

    access_token: str
    expires_in: int
    token_type: str
    scope: str
    id_token: str
    refresh_token: str


class GoogleIdTokenPayloadDTO(BaseModel):
    """DTO для декодированного содержимого id_token (JWT)"""

    iss: str  # Должен быть "https://accounts.google.com"
    aud: str  # Ваш Google Client ID
    sub: str = Field(..., description="Уникальный ID пользователя в Google")

    email: EmailStr
    email_verified: bool

    name: str
    picture: Optional[str] = None
    given_name: Optional[str] = None
    family_name: Optional[str] = None

    iat: int  # Время выпуска (Unix timestamp)
    exp: int  # Время истечения (Unix timestamp)

    # Поля, которые могут отсутствовать в зависимости от настроек приложения
    azp: Optional[str] = None
    at_hash: Optional[str] = None
