from datetime import datetime
import logging

from fastapi import HTTPException
import httpx
from faststream.rabbit import RabbitQueue
import jwt

from dto.internal.google import GoogleTokenResponseDTO, GoogleIdTokenPayloadDTO
from dto.internal.auth import PlatformUser, AuthStrategy
from dto.internal.token import Tokens
from adapters._rabbit.event_broker import bot_google_connect_request

from settings import settings

logger = logging.getLogger(__name__)


class AuthGoogleService(AuthStrategy):
    def __init__(self, queue: RabbitQueue):
        self.bot_connect_request_queue = queue

    def allow_email_collision(self) -> bool:
        return True

    def get_token(self, code) -> GoogleTokenResponseDTO:
        response = httpx.post(
            f"{settings.TWITCH_URL}/oauth2/token",
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "grant_type": "authorization_code",
                "redirect_uri": settings.GOOGLE_REDIRECT_URI,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        if response.status_code != 200:
            logger.error(f"Failed to get access token from Google: {response.text}")
            raise HTTPException(400, f"Failed to get user data from Google: {response.text}")

        if not response.json().get("refresh_token"):
            raise HTTPException(400, f"Failed to get refresh token from Google: {response.text}")

        return GoogleTokenResponseDTO.model_validate(response.json())

    async def refresh_token(self, refresh_token: str) -> GoogleTokenResponseDTO:
        response = httpx.post(
            "https://oauth2.googleapis.com/token",
            data={
                "refresh_token": refresh_token,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "grant_type": "refresh_token",
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        if response.status_code != 200:
            logger.error(f"Failed to get access token from Google: {response.text}")
            raise HTTPException(400, f"Failed to get user data from Google: {response.text}")

        return GoogleTokenResponseDTO.model_validate(response.json())

    def validate_token(self, tokens: Tokens) -> bool:
        response = httpx.post(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"access_token": tokens.access_token},
        )
        if response.status_code != 200:
            logger.error(f"Failed to validate token from Google: {response.text}")
            return False

        return True

    def get_data(self, id_token: str) -> GoogleIdTokenPayloadDTO:
        user_info = jwt.decode(id_token, options={"verify_signature": False})

        return GoogleIdTokenPayloadDTO.model_validate(user_info)

    async def fetch_identity(self, code: str) -> PlatformUser:
        token = self.get_token(code)
        google_user = self.get_data(token.id_token)
        user = PlatformUser(
            id=google_user.iss,
            username=google_user.name,
            avatar_url=google_user.picture or "",
            email=google_user.email,
            email_verified=google_user.email_verified,
            access_token=token.access_token,
            refresh_token=token.refresh_token,
            expires_at=int(datetime.now().timestamp()) + token.expires_in,
        )
        return user


auth_googleservice = AuthGoogleService(bot_google_connect_request)
