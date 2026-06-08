from datetime import datetime
import logging

from fastapi import HTTPException
import httpx
from faststream.rabbit import RabbitQueue
import jwt

from src.dto.internal.donatex import DonateXTokenResponse, DonateXUserResponse
from src.dto.internal.auth import PlatformUser, AuthStrategyPKCE
from src.dto.internal.token import Tokens
from src.adapters._rabbit.event_broker import bot_google_connect_request

from src.settings import settings

logger = logging.getLogger(__name__)


class AuthDonateXService(AuthStrategyPKCE):
    name: str = "DonateX"

    def __init__(self, queue: RabbitQueue):
        self.bot_connect_request_queue = queue

    def allow_email_collision(self) -> bool:
        return True

    def get_token(self, code, code_verifier) -> DonateXTokenResponse:
        response = httpx.post(
            settings.DONATEX_URL + "/connect/token",
            data={
                "code": code,
                "client_id": settings.DONATEX_CLIENT_ID,
                "client_secret": settings.DONATEX_CLIENT_SECRET,
                "grant_type": "authorization_code",
                "redirect_uri": settings.DONATEX_REDIRECT_URI,
                "code_verifier": code_verifier,
            },
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

    # def validate_token(self, tokens: Tokens) -> bool:
    #     response = httpx.post(
    #         "https://oauth2.googleapis.com/tokeninfo",
    #         params={"access_token": tokens.access_token},
    #     )
    #     if response.status_code != 200:
    #         logger.error(f"Failed to validate token from {self.name}: {response.text}")
    #         return False

    #     return True

    def get_data(self, access_token: str) -> DonateXUserResponse:
        response = httpx.get(
            settings.DONATEX_URL + "/v1/user/me",
            headers={"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"},
        )
        if response.status_code != 200:
            logger.error(f"Failed to get user data from {self.name}: {response.text}")
            raise HTTPException(400, f"Failed to get user data from {self.name}: {response.text}")

        return DonateXUserResponse.model_validate(response.json())

    async def fetch_identity(self, code: str, code_verifier: str) -> PlatformUser:
        token = self.get_token(code, code_verifier)
        donatex_user = self.get_data(token.access_token)
        user = PlatformUser(
            id=donatex_user.id,
            username=donatex_user.username,
            avatar_url=donatex_user.avatarUrl or "",
            email=None,
            email_verified=False,
            access_token=token.access_token,
            refresh_token=token.refresh_token,
            expires_at=int(datetime.now().timestamp()) + token.expires_in,
        )
        return user


auth_googleservice = AuthDonateXService(bot_google_connect_request)
