from datetime import datetime
import logging

from fastapi import HTTPException
from faststream.rabbit import RabbitQueue
import httpx

from src.dto.internal.donatex import DonateXTokenResponse, DonateXUserResponse
from src.dto.internal.auth import (
    PlatformMeta,
    PlatformUser,
    IntegrationStrategy,
    PlatformAuthResult,
    PlatformTokens,
    AuthFlow,
)

from src.settings import settings
from src._types import IntegrationPlatform, IntegrationType, PlatformCap

logger = logging.getLogger(__name__)


class AuthDonateXService(IntegrationStrategy):
    name: str = "DonateX"
    meta: PlatformMeta = PlatformMeta(
        platform=IntegrationPlatform.DONATEX,
        integration_type=IntegrationType.BOT_ONLY,
        auth_flow=AuthFlow.PKCE,
        allow_email_collision=False,
        bot_capabilities={
            PlatformCap.DONATIONS,
        },
    )

    def get_bot_queue(self) -> RabbitQueue | None:
        return super().get_bot_queue()

    def get_token(self, code, code_verifier) -> DonateXTokenResponse:
        data = {
            "code": code,
            "client_id": settings.DONATEX_CLIENT_ID,
            "client_secret": settings.DONATEX_CLIENT_SECRET,
            "grant_type": "authorization_code",
            "redirect_uri": settings.DONATEX_REDIRECT_URI,
            "code_verifier": code_verifier,
        }
        logger.error(f"Data for access token request {self.name}: {data}")
        response = httpx.post(
            settings.DONATEX_URL + "/connect/token",
            data=data,
        )
        if response.status_code != 200:
            logger.error(f"Failed to get access token from {self.name}: {response.text}")
            raise HTTPException(400, f"Failed to get user data from {self.name}: {response.text}")

        if not response.json().get("refresh_token"):
            raise HTTPException(400, f"Failed to get refresh token from {self.name}: {response.text}")

        return DonateXTokenResponse.model_validate(response.json())

    async def refresh_token(self, refresh_token: str) -> DonateXTokenResponse:
        response = httpx.post(
            settings.DONATEX_URL + "/connect/token",
            data={
                "refresh_token": refresh_token,
                "client_id": settings.DONATEX_CLIENT_ID,
                "client_secret": settings.DONATEX_CLIENT_SECRET,
                "grant_type": "refresh_token",
            },
        )
        if response.status_code != 200:
            logger.error(f"Failed to get access token from {self.name}: {response.text}")
            raise HTTPException(400, f"Failed to get user data from {self.name}: {response.text}")

        return DonateXTokenResponse.model_validate(response.json())

    def get_data(self, access_token: str) -> DonateXUserResponse:
        response = httpx.get(
            settings.DONATEX_URL + "/v1/user/me",
            headers={"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"},
        )
        if response.status_code != 200:
            logger.error(f"Failed to get user data from {self.name}: {response.text}")
            raise HTTPException(400, f"Failed to get user data from {self.name}: {response.text}")

        return DonateXUserResponse.model_validate(response.json())

    async def fetch_identity(
        self, code: str | None = None, code_verifier: str | None = None, user_key: str | None = None
    ) -> PlatformAuthResult:
        token = self.get_token(code, code_verifier)
        donatex_user = self.get_data(token.access_token)
        user = PlatformUser(
            id=donatex_user.id,
            username=donatex_user.username,
            avatar_url=donatex_user.avatarUrl or "",
            email=None,
            email_verified=False,
        )
        tokens = PlatformTokens(
            access_token=token.access_token,
            refresh_token=token.refresh_token,
            expires_at=int(datetime.now().timestamp()) + token.expires_in,
            token_type=token.token_type,
        )
        return PlatformAuthResult(user=user, tokens=tokens)


auth_googleservice = AuthDonateXService()
