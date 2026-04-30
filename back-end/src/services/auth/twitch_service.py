import logging

from fastapi import HTTPException
import httpx
from faststream.rabbit import RabbitQueue

from dto.internal.twitch import TwitchUserResponse, TwitchAuthResponse
from models.auth_user import AuthUserSchema
from services.auth.strategy_manager import manager, PlatformUser, AuthStrategy
from adapters._rabbit.event_broker import bot_twitch_connect_request

from settings import settings
from _types import Platform
from utils import find

logger = logging.getLogger(__name__)


@manager.register("twitch", queue=bot_twitch_connect_request)
class AuthTwitchService(AuthStrategy):
    def __init__(self, queue: RabbitQueue):
        self.bot_connect_request_queue = queue

    def allow_email_collision(self) -> bool:
        return True

    def get_token(self, code) -> TwitchAuthResponse:
        response = httpx.post(
            f"{settings.TWITCH_URL}/oauth2/token",
            data={
                "code": code,
                "client_id": settings.TWITCH_CLIENT_ID,
                "client_secret": settings.TWITCH_CLIENT_SECRET,
                "grant_type": "authorization_code",
                "redirect_uri": settings.TWITCH_REDIRECT_URI,
            },
        )
        if response.status_code != 200:
            logger.error(f"Failed to get access token from Twitch: {response.text}")
            raise HTTPException(400, f"Failed to get user data from Twitch: {response.text}")

        return TwitchAuthResponse.model_validate(response.json())

    def refresh_token(self, refresh_token: str) -> TwitchAuthResponse:
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

    def get_data(self, access_token: str, user: AuthUserSchema | None = None) -> TwitchUserResponse:
        twitch_acc = find(user.linked_accounts, lambda x: x.platform == Platform.TWITCH) if user else None

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

    async def fetch_identity(self, code: str) -> PlatformUser:
        token = self.get_token(code)
        twitch_user = self.get_data(token.access_token)
        user = PlatformUser(
            id=twitch_user.id,
            username=twitch_user.display_name,
            avatar_url=twitch_user.profile_image_url,
            email=twitch_user.email,
            email_verified=twitch_user.email_verified,
            access_token=token.access_token,
            refresh_token=token.refresh_token,
            expires_at=token.expires_in,
        )
        return user


auth_twitch_service = AuthTwitchService(bot_twitch_connect_request)
