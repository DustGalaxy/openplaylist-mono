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
        auth_flow=AuthFlow.USER_KEY,
        allow_email_collision=False,
        bot_capabilities={
            PlatformCap.DONATIONS,
        },
    )

    def get_bot_queue(self) -> RabbitQueue | None:
        return super().get_bot_queue()

    def get_data(self, access_token: str) -> DonateXUserResponse:
        response = httpx.get(
            settings.DONATEX_URL + "/v1/user",
            params={"access_token": access_token},
        )
        if response.status_code != 200:
            logger.error(f"Failed to get user data from {self.name}: {response.text}")
            raise HTTPException(400, f"Failed to get user data from {self.name}: {response.text}")

        return DonateXUserResponse.model_validate(response.json().get("data"))

    async def fetch_identity(
        self, code: str | None = None, code_verifier: str | None = None, user_key: str | None = None
    ) -> PlatformAuthResult:
        if not user_key:
            raise HTTPException(400, "user_key is required")
        donatex_user = self.get_data(user_key)
        user = PlatformUser(
            id=donatex_user.id,
            username=donatex_user.username,
            avatar_url=donatex_user.avatarUrl or "",
            email=None,
            email_verified=False,
        )
        tokens = PlatformTokens(
            access_token=user_key,
            refresh_token=None,
            expires_at=None,
            token_type="Bearer",
        )
        return PlatformAuthResult(user=user, tokens=tokens)


auth_googleservice = AuthDonateXService()
