import time
from datetime import datetime
from typing import Annotated
from uuid import UUID

import jwt
from faststream.rabbit import RabbitQueue
from fastapi.security import APIKeyCookie
from fastapi import Depends, HTTPException, logger
from sqlalchemy.ext.asyncio import AsyncSession
from simple_repository.exceptions import NotFoundException

from _types import Platform
from database import get_async_session
from settings import settings
from dto.user import LinkedAccountWithTokensRead
from repo import LinkedAccountsRepository, UserRepository

from models.auth_user import AuthUserDomain
from services.twitch_service import auth_twitch_service
from services.da_service import auth_da_service
from adapters._rabbit.event_broker import (
    broker,
    main_exchange,
    bot_twitch_connect_request,
    bot_twitch_connect_response,
    bot_da_connect_request,
    bot_da_connect_response,
)
from utils import find

security_scheme = APIKeyCookie(name=settings.COOKIE_NAME)


class AuthService:
    def __init__(self, user_repo: UserRepository, link_repo: LinkedAccountsRepository):
        self.user_repo: UserRepository = user_repo
        self.link_repo: LinkedAccountsRepository = link_repo

    def intergations(self, user: AuthUserDomain) -> list[dict]:
        return [x.model_dump() for x in user.linked_accounts]

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
        return encoded_jwt

    async def refresh_account_tokens(self, db_session: AsyncSession, user: AuthUserDomain) -> AuthUserDomain:
        for link in user.linked_accounts:
            if link.platform == Platform.TWITCH:
                if link.expires_at < int(time.time()):
                    twitch_tokens = auth_twitch_service.refresh_token(link.refresh_token)
                    link.access_token = twitch_tokens.access_token
                    link.refresh_token = twitch_tokens.refresh_token
                    link.expires_at = int(time.time()) + twitch_tokens.expires_in
                    await self.user_repo.update(db_session, user)

            elif link.platform == Platform.DA:
                if link.expires_at < int(time.time()):
                    da_tokens = await auth_da_service.refresh_token(link.refresh_token)
                    link.access_token = da_tokens.access_token
                    link.refresh_token = da_tokens.refresh_token if da_tokens.refresh_token else link.refresh_token
                    link.expires_at = int(time.time()) + da_tokens.expires_in
                    await self.user_repo.update(db_session, user)

        return user

    # async def upd_data(self, db_session: AsyncSession, user: AuthUserDomain) -> AuthUserDomain:
    #     for link in user.linked_accounts:
    #         if link.platform == Platform.TWITCH:
    #             twitch_data = auth_twitch_service.get_data(link.access_token)
    #             link.platform_username = twitch_data.display_name
    #             link.platform_avatar_url = twitch_data.profile_image_url

    #         elif link.platform == Platform.DA:
    #             da_data = await auth_da_service.get_data(link.access_token)
    #             link.platform_username = da_data.name
    #             link.platform_avatar_url = da_data.avatar

    #         link = await self.link_repo.update(db_session, link)

    #     return user

    async def get_current_user(
        self,
        db_session: Annotated[AsyncSession, Depends(get_async_session)],
        token: str = Depends(security_scheme),
    ):
        try:
            payload = jwt.decode(token, settings.JWT_PUBLIC_KEY, algorithms=[settings.JWT_ALGORITHM])
            user_id = payload["sub"]
            # username = payload["username"]
            exp = payload["exp"]

            if exp < int(datetime.now().timestamp()):
                raise HTTPException(status_code=401, detail="Session expired")
        except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
            raise HTTPException(status_code=401, detail="Not authenticated")
        try:
            user: AuthUserDomain = await self.user_repo.get_one(db_session, UUID(user_id))
        except NotFoundException:
            raise HTTPException(status_code=404, detail="User not found")

        return user

    async def connect_bot(self, db_session: AsyncSession, user: AuthUserDomain, type: Platform) -> None:
        q: RabbitQueue
        if type == Platform.TWITCH:
            q = bot_twitch_connect_request
        elif type == Platform.DA:
            q = bot_da_connect_request
        else:
            raise HTTPException(status_code=400, detail="Invalid platform")

        link = find(user.linked_accounts, lambda x: x.platform == type)
        if not link:
            raise HTTPException(status_code=400, detail="User does not have a needed integration")
        link.bot_connection = True

        await broker.publish(LinkedAccountWithTokensRead.model_validate(link), q, main_exchange)
        await self.link_repo.update(db_session, link)


auth_service = AuthService(UserRepository(), LinkedAccountsRepository())
