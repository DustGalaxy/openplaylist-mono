import logging
from datetime import datetime

import httpx
import jwt
from fastapi import HTTPException
from faststream.rabbit import RabbitQueue

from src._types import IntegrationPlatform, IntegrationType
from src.dto.internal.auth import (
    AuthFlow,
    IntegrationStrategy,
    PlatformAuthResult,
    PlatformMeta,
    PlatformTokens,
    PlatformUser,
    RefreshTokenStrategy,
)
from src.dto.internal.google import GoogleIdTokenPayloadDTO, GoogleTokenResponseDTO
from src.dto.internal.token import Tokens
from src.settings import settings

logger = logging.getLogger(__name__)


class AuthGoogleService(IntegrationStrategy, RefreshTokenStrategy):
    meta: PlatformMeta = PlatformMeta(
        platform=IntegrationPlatform.GOOGLE,
        integration_type=IntegrationType.IDENTITY_ONLY,
        auth_flow=AuthFlow.AUTH_CODE,
        allow_email_collision=True,
    )

    def get_bot_queue(self) -> RabbitQueue | None:
        return None

    def get_token(self, code) -> GoogleTokenResponseDTO:
        response = httpx.post(
            "https://oauth2.googleapis.com/token",
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

    async def fetch_identity(
        self, code: str | None = None, code_verifier: str | None = None, user_key: str | None = None
    ) -> PlatformAuthResult:
        token = self.get_token(code)
        google_user = self.get_data(token.id_token)
        user = PlatformUser(
            id=google_user.sub,
            username=google_user.name,
            avatar_url=google_user.picture or "",
            email=google_user.email,
            email_verified=google_user.email_verified,
        )
        tokens = PlatformTokens(
            access_token=token.access_token,
            refresh_token=token.refresh_token,
            expires_at=int(datetime.now().timestamp()) + token.expires_in,
            token_type=token.token_type,
        )
        return PlatformAuthResult(user=user, tokens=tokens)


auth_googleservice = AuthGoogleService()
