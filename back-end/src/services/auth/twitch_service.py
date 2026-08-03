import logging
from datetime import datetime
from typing import Any, ClassVar

import httpx
from fastapi import HTTPException
from faststream.rabbit import RabbitQueue
from pydantic import BaseModel
from src._types import IntegrationPlatform, IntegrationType, PlatformCap
from src.adapters._rabbit.queues import bot_twitch_connect_request, bot_twitch_disconect, bot_twitch_settings
from src.dto.internal.auth import (
    AuthFlow,
    IntegrationStrategy,
    PlatformAuthResult,
    PlatformMeta,
    PlatformTokens,
    PlatformUser,
    RefreshTokenStrategy,
)
from src.dto.internal.token import Tokens
from src.dto.internal.twitch import TwitchAuthResponse, TwitchBotSettings, TwitchUserResponse
from src.models.auth_user import AuthUserSchema
from src.settings import settings
from src.utils import find

logger = logging.getLogger(__name__)


class AuthTwitchService(IntegrationStrategy, RefreshTokenStrategy):
    meta: PlatformMeta = PlatformMeta(
        platform=IntegrationPlatform.TWITCH,
        integration_type=IntegrationType.IDENTITY_AND_BOT,
        auth_flow=AuthFlow.AUTH_CODE,
        allow_email_collision=True,
        bot_capabilities={
            PlatformCap.CHAT,
        },
    )
    bot_settings_schema = TwitchBotSettings

    def get_bot_queue(self) -> RabbitQueue | None:
        return bot_twitch_connect_request

    def get_bot_settings_queue(self) -> RabbitQueue | None:
        return bot_twitch_settings

    def get_bot_disconect_queue(self) -> RabbitQueue | None:
        return bot_twitch_disconect

    def get_token(self, code: str, redirect_uri: str | None = None) -> TwitchAuthResponse:
        response = httpx.post(
            f"{settings.TWITCH_URL}/oauth2/token",
            data={
                "code": code,
                "client_id": settings.TWITCH_CLIENT_ID,
                "client_secret": settings.TWITCH_CLIENT_SECRET,
                "grant_type": "authorization_code",
                "redirect_uri": redirect_uri or settings.TWITCH_REDIRECT_URI,
            },
        )
        if response.status_code != 200:
            logger.error(f"Failed to get access token from Twitch: {response.text}")
            raise HTTPException(400, f"Failed to get user data from Twitch: {response.text}")

        return TwitchAuthResponse.model_validate(response.json())

    async def refresh_token(self, refresh_token: str) -> TwitchAuthResponse:
        response = httpx.post(
            f"{settings.TWITCH_URL}/oauth2/token",
            data={
                "refresh_token": refresh_token,
                "client_id": settings.TWITCH_CLIENT_ID,
                "client_secret": settings.TWITCH_CLIENT_SECRET,
                "grant_type": "refresh_token",
            },
        )
        if response.status_code != 200:
            logger.error(f"Failed to get access token from Twitch: {response.text}")
            raise HTTPException(400, f"Failed to get user data from Twitch: {response.text}")

        return TwitchAuthResponse.model_validate(response.json())

    def validate_token(self, tokens: Tokens) -> bool:
        response = httpx.post(
            f"{settings.TWITCH_URL}/oauth2/validate",
            headers={"Authorization": f"Bearer {tokens.access_token}"},
        )
        if response.status_code != 200:
            logger.error(f"Failed to validate token from Twitch: {response.text}")
            return False

        return True

    def get_data(self, access_token: str, user: AuthUserSchema | None = None) -> TwitchUserResponse:
        twitch_acc = find(user.linked_accounts, lambda x: x.platform == IntegrationPlatform.TWITCH) if user else None

        response = httpx.get(
            "https://api.twitch.tv/helix/users",
            headers={"Authorization": f"Bearer {access_token}", "Client-ID": settings.TWITCH_CLIENT_ID},
            params={"id": str(twitch_acc.platform_user_id)} if twitch_acc else {},
        )
        if response.status_code != 200:
            logger.error(f"Failed to get user data from Twitch: {response.text}")
            raise HTTPException(400, f"Failed to get user data from Twitch: {response.text}")

        result = response.json().get("data")[0] if response.json().get("data") else response.json()
        if not result.get("email"):
            result["email"] = ""
            result["email_verified"] = False
        else:
            result["email_verified"] = True

        return TwitchUserResponse.model_validate(result)

    async def fetch_identity(
        self,
        code: str | None = None,
        code_verifier: str | None = None,
        user_key: str | None = None,
    ) -> PlatformAuthResult:

        if not code:
            raise HTTPException(400, "code is required")

        token = self.get_token(code)
        twitch_user = self.get_data(token.access_token)
        user = PlatformUser(
            id=twitch_user.id,
            username=twitch_user.display_name,
            avatar_url=twitch_user.profile_image_url,
            email=twitch_user.email,
            email_verified=twitch_user.email_verified,
        )
        tokens = PlatformTokens(
            access_token=token.access_token,
            refresh_token=token.refresh_token,
            expires_at=int(datetime.now().timestamp()) + token.expires_in,
            token_type=token.token_type,
        )
        return PlatformAuthResult(user=user, tokens=tokens)

    def get_broadcaster_subscriptions(
        self, access_token: str, broadcaster_id: str
    ) -> list[dict[str, Any]]:
        """Fetch all subscribers for a Twitch channel using broadcaster OAuth token."""
        subscribers: list[dict[str, Any]] = []
        cursor: str | None = None

        while True:
            params: dict[str, Any] = {"broadcaster_id": broadcaster_id, "first": 100}
            if cursor:
                params["after"] = cursor

            response = httpx.get(
                "https://api.twitch.tv/helix/subscriptions",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Client-ID": settings.TWITCH_CLIENT_ID,
                },
                params=params,
            )

            if response.status_code != 200:
                logger.error(f"Failed to fetch subscriptions for broadcaster {broadcaster_id}: {response.text}")
                raise HTTPException(response.status_code, f"Failed to fetch subscriptions from Twitch: {response.text}")

            body = response.json()
            data = body.get("data", [])
            if isinstance(data, list):
                subscribers.extend(data)

            cursor = body.get("pagination", {}).get("cursor")
            if not cursor or not data:
                break

        return subscribers


auth_twitch_service = AuthTwitchService()
