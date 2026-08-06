import logging

from fastapi import HTTPException
from faststream.rabbit import RabbitQueue
import httpx

from src.dto.internal.auth import (
    PlatformMeta,
    PlatformUser,
    IntegrationStrategy,
    PlatformAuthResult,
    PlatformTokens,
    AuthFlow,
)
from src.adapters._rabbit.queues import bot_donatepay_connect_request
from src.settings import settings
from src._types import IntegrationPlatform, IntegrationType, PlatformCap

logger = logging.getLogger(__name__)


class AuthDonatePayService(IntegrationStrategy):
    name: str = "DonatePay"
    meta: PlatformMeta = PlatformMeta(
        platform=IntegrationPlatform.DONATEPAY,
        integration_type=IntegrationType.BOT_ONLY,
        auth_flow=AuthFlow.USER_KEY,
        allow_email_collision=False,
        bot_capabilities={
            PlatformCap.DONATIONS,
        },
    )

    def get_bot_queue(self) -> RabbitQueue | None:
        return bot_donatepay_connect_request

    def get_data(self, access_token: str) -> dict:
        url = getattr(settings, "DONATEPAY_URL", "https://donatepay.eu/api/v1") + "/user"
        response = httpx.get(
            url,
            params={"access_token": access_token},
        )
        if response.status_code != 200:
            logger.error(f"Failed to get user data from {self.name}: {response.text}")
            raise HTTPException(400, f"Failed to get user data from {self.name}: {response.text}")

        res_data = response.json()
        if res_data.get("status") != "success" and "data" not in res_data:
            logger.error(f"Invalid response from {self.name}: {response.text}")
            raise HTTPException(400, f"Invalid user key or API error from {self.name}")

        return res_data.get("data", res_data)

    async def fetch_identity(
        self, code: str | None = None, code_verifier: str | None = None, user_key: str | None = None
    ) -> PlatformAuthResult:
        if not user_key:
            raise HTTPException(400, "user_key is required")
        user_data = self.get_data(user_key)
        user = PlatformUser(
            id=str(user_data.get("id")),
            username=user_data.get("name") or user_data.get("username") or f"user_{user_data.get('id')}",
            avatar_url=user_data.get("avatar") or "",
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


auth_donatepay_service = AuthDonatePayService()
