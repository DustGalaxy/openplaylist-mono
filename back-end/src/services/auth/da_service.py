import json
import logging
from datetime import datetime

import httpx
from fastapi import HTTPException
from faststream.rabbit import RabbitQueue

from src.settings import settings
from src.dto.internal.da import DAToken, DAUser
from src.dto.internal.token import Tokens
from src.dto.internal.auth import (
    IntegrationType,
    IntegrationPlatform,
    IntegrationStrategy,
    PlatformUser,
    PlatformTokens,
    PlatformAuthResult,
    PlatformMeta,
    AuthFlow,
    RefreshTokenStrategy,
)
from src.adapters._rabbit.queues import bot_da_connect_request
from src._types import PlatformCap

logger = logging.getLogger(__name__)


class AuthDAService(IntegrationStrategy, RefreshTokenStrategy):
    meta: PlatformMeta = PlatformMeta(
        platform=IntegrationPlatform.DA,
        integration_type=IntegrationType.IDENTITY_AND_BOT,
        auth_flow=AuthFlow.AUTH_CODE,
        allow_email_collision=True,
        bot_capabilities={
            PlatformCap.DONATIONS,
        },
    )

    def get_bot_queue(self) -> RabbitQueue:
        return bot_da_connect_request

    async def _make_api_request(self, method: str, endpoint: str, access_token: str, **kwargs):
        """Helper to make authenticated requests to the DA API."""
        headers = {"Authorization": f"Bearer {access_token}"}
        url = f"{settings.DA_API_BASE_URL}{endpoint}"
        async with httpx.AsyncClient() as client:
            try:
                response = await client.request(method, url, headers=headers, **kwargs)
                response.raise_for_status()
                if not response.content:
                    logger.warning(f"Empty response received from {url}")
                    raise HTTPException(status_code=400)
                return response.json()
            except httpx.HTTPStatusError as e:
                logger.error(f"HTTP Error during API request to {url}: {e.response.status_code} - {e.response.text}")
                if e.response.status_code == 401:
                    logger.error("Token might be expired or invalid.")
                raise HTTPException(status_code=400)

            except httpx.RequestError as e:
                logger.error(f"Network error during API request to {url}: {e}")
                raise HTTPException(status_code=400)

            except json.JSONDecodeError as e:
                logger.error(f"Failed to decode JSON response from {url}: {e}")
                logger.error(f"Response content was: {response.text}")  # type: ignore
                raise HTTPException(status_code=400)

    async def get_token(self, code: str):
        data = {
            "grant_type": "authorization_code",
            "client_id": settings.DA_APP_ID,
            "client_secret": settings.DA_API_KEY,
            "code": code,
            "redirect_uri": settings.DA_REDIRECT_URI,
        }
        async with httpx.AsyncClient() as client:
            response = await client.post(settings.DA_TOKEN_URL, data=data)
            response.raise_for_status()
            token_data = response.json()

        return DAToken(
            access_token=token_data["access_token"],
            refresh_token=token_data.get("refresh_token"),
            expires_in=token_data["expires_in"],
            expires_at=int(datetime.now().timestamp()) + token_data["expires_in"],
            token_type=token_data["token_type"],
        )

    async def get_data(self, access_token: str) -> DAUser:
        data = await self._make_api_request("GET", "/user/oauth", access_token)
        data = data["data"]
        return DAUser(
            id=str(data["id"]),
            code=data["code"],
            name=data["name"],
            avatar=data["avatar"],
            email=data["email"],
            language=data["language"],
            socket_connection_token=data["socket_connection_token"],
        )

    async def refresh_token(self, refresh_token: str) -> DAToken:
        data = {
            "grant_type": "refresh_token",
            "client_id": settings.DA_APP_ID,
            "client_secret": settings.DA_API_KEY,
            "refresh_token": refresh_token,
            "redirect_uri": settings.DA_REDIRECT_URI,
        }
        async with httpx.AsyncClient() as client:
            try:
                logger.info("Attempting to refresh access token...")
                response = await client.post(settings.DA_TOKEN_URL, data=data)
                response.raise_for_status()
                data = response.json()
                if not data.get("refresh_token", None):
                    data["refresh_token"] = refresh_token
                new_token_data = DAToken.model_validate(data)

                logger.info("Access token refreshed and saved successfully.")
                return new_token_data

            except httpx.HTTPStatusError as e:
                logger.error(f"HTTP Error refreshing token: {e.response.status_code} - {e.response.text}")
                if e.response.status_code in [400, 401]:
                    logger.error("Refresh token likely invalid or revoked.")
                raise HTTPException(status_code=400)

            except httpx.RequestError as e:
                logger.error(f"Network error refreshing token: {e}")
                raise HTTPException(status_code=400)

            except json.JSONDecodeError as e:
                logger.error(f"Failed to decode JSON refresh token response: {e}")
                raise HTTPException(status_code=400)

    async def fetch_identity(
        self, code: str | None = None, code_verifier: str | None = None, user_key: str | None = None
    ) -> PlatformAuthResult:
        if not code:
            raise HTTPException(400, "code is required")
        token = await self.get_token(code)
        da_user = await self.get_data(token.access_token)
        user = PlatformUser(
            id=da_user.id,
            username=da_user.name,
            avatar_url=da_user.avatar,
            email=da_user.email,
            email_verified=True,
        )
        tokens = PlatformTokens(
            access_token=token.access_token,
            refresh_token=token.refresh_token,
            expires_at=token.expires_at,
            token_type=token.token_type,
        )
        return PlatformAuthResult(user=user, tokens=tokens)


auth_da_service = AuthDAService()
