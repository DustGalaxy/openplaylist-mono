from datetime import datetime
import logging
from uuid import UUID

from fastapi import HTTPException
from simple_repository.exceptions import NotFoundException
import httpx
import jwt

from _types import AsyncSession, Platform
from models.linked_accounts import LinkedAccountsCreate, LinkedAccountsUpdate
from repo import UserRepository, LinkedAccountsRepository
from settings import settings

from dto.internal.twitch import TwitchUserResponse, TwitchAuthResponse
from models.auth_user import AuthUserCreate, AuthUserSchema, AuthUserUpdate
from services.auth.strategy_manager import manager, PlatformUser
from utils import find

logger = logging.getLogger(__name__)


@manager.register("twitch", user_repo=UserRepository(), link_repo=LinkedAccountsRepository())
class AuthTwitchService:
    def __init__(self, user_repo: UserRepository, link_repo: LinkedAccountsRepository):
        self.user_repo = user_repo
        self.link_repo = link_repo
        self.platform = Platform.TWITCH

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

        return TwitchUserResponse.model_validate(
            response.json().get("data")[0] if response.json().get("data") else response.json()
        )

    def encode_jwt(self, id: UUID, user_name: str) -> str:
        encoded_jwt = jwt.encode(
            {
                "sub": str(id),
                "username": user_name,
                "exp": settings.SESSION_LIVE_TIME + int(datetime.now().timestamp()),
                "iat": int(datetime.now().timestamp()),
                "iss": settings.JWT_ISSUER,
            },
            settings.JWT_SECRET_KEY,
            algorithm=settings.JWT_ALGORITHM,
        )
        print(encoded_jwt)
        return encoded_jwt

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

    async def add_integration(self, db_session: AsyncSession, user_id: UUID, code: str) -> AuthUserSchema:
        try:
            db_user = await self.user_repo.get_one(db_session, user_id, column="id")
            integration = find(db_user.linked_accounts, lambda x: x.platform == self.platform)
            if not integration:
                token = self.get_token(code)
                twitch_user = self.get_data(token.access_token, db_user)
                link = LinkedAccountsCreate(
                    user_id=user_id,
                    platform=self.platform,
                    platform_user_id=twitch_user.id,
                    platform_user_email=twitch_user.email,
                    platform_username=twitch_user.display_name,
                    platform_avatar_url=twitch_user.profile_image_url,
                    access_token=token.access_token,
                    refresh_token=token.refresh_token,
                    expires_at=token.expires_in,
                )
                db_link = await self.link_repo.create(db_session, link)
                db_user.linked_accounts.append(db_link)
                return db_user

            else:
                raise HTTPException(status_code=400, detail="User already has a da integration")
        except NotFoundException:
            raise HTTPException(status_code=404, detail="User not found")

    async def delete_integration(self, db_session: AsyncSession, user_id: UUID) -> None:
        try:
            db_user = await self.user_repo.get_one(db_session, user_id, column="id")
            twitch_acc = find(db_user.linked_accounts, lambda x: x.platform == self.platform)
            if not twitch_acc:
                raise HTTPException(status_code=400, detail="User does not have a twitch integration")

            await self.link_repo.remove(db_session, twitch_acc.id)
        except NotFoundException:
            raise HTTPException(status_code=404, detail="User not found")
