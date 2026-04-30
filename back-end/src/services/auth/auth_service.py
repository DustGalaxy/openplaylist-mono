from datetime import datetime
from typing import Annotated
from uuid import UUID

from repo import user_repository
import jwt
from fastapi.security import APIKeyCookie
from fastapi import Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from simple_repository.exceptions import NotFoundException

from _types import Platform
from database import get_async_session
from settings import settings
from dto.user import LinkedAccountWithTokensRead
from repo import LinkedAccountsRepository, UserRepository

from models.auth_user import AuthUserSchema, AuthUserCreate
from models.linked_accounts import LinkedAccountsCreate
from services.auth.strategy_manager import manager
from adapters._rabbit.event_broker import (
    broker,
    main_exchange,
)
from exceptions import NeedConfirmationException

from utils import find

security_scheme = APIKeyCookie(name=settings.COOKIE_NAME)


class AuthService:
    def __init__(self, user_repo: UserRepository, link_repo: LinkedAccountsRepository):
        self.user_repo: UserRepository = user_repo
        self.link_repo: LinkedAccountsRepository = link_repo

    def intergations(self, user: AuthUserSchema) -> list[dict]:
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

    async def refresh_account_tokens(self, db_session: AsyncSession, user: AuthUserSchema) -> AuthUserSchema:
        # for link in user.linked_accounts:
        #     if link.platform == Platform.TWITCH:
        #         if link.expires_at < int(time.time()):
        #             twitch_tokens = auth_twitch_service.refresh_token(link.refresh_token)
        #             link.access_token = twitch_tokens.access_token
        #             link.refresh_token = twitch_tokens.refresh_token
        #             link.expires_at = int(time.time()) + twitch_tokens.expires_in
        #             await self.user_repo.update(db_session, user)

        #     elif link.platform == Platform.DA:
        #         if link.expires_at < int(time.time()):
        #             da_tokens = await auth_da_service.refresh_token(link.refresh_token)
        #             link.access_token = da_tokens.access_token
        #             link.refresh_token = da_tokens.refresh_token if da_tokens.refresh_token else link.refresh_token
        #             link.expires_at = int(time.time()) + da_tokens.expires_in
        #             await self.user_repo.update(db_session, user)

        # return user
        ...

    async def confirm_account_merge(self, db_session: AsyncSession, data: dict) -> str:

        await self.link_repo.create(
            db_session,
            LinkedAccountsCreate(
                user_id=data["existing_user_id"],
                platform=data["platform"],
                platform_user_id=data["platform_user_id"],
                platform_username=data["platform_username"],
                platform_avatar_url=data["platform_avatar_url"],
                platform_user_email=data["platform_user_email"],
                access_token=data["access_token"],
                refresh_token=data["refresh_token"],
                expires_at=data["expires_at"],
            ),
        )
        user = await self.user_repo.get_one(db_session, data["existing_user_id"], column="id")
        if not user:
            raise HTTPException(status_code=400, detail="User not found")

        return self.encode_jwt(user.id, user.username)

    async def login_by_social(
        self,
        db_session: AsyncSession,
        code: str,
        type: str,
    ):
        strtg = manager.get_strategy(type)
        if strtg is None:
            raise HTTPException(status_code=400, detail="Platform not supported")

        platform_user = await strtg.fetch_identity(code)
        try:
            link_by_id = await self.link_repo.get_one(db_session, platform_user.get("id"), column="platform_user_id")
        except NotFoundException:
            link_by_id = None

        # level 1 - link with id already exists
        if link_by_id:
            user = await self.user_repo.get_one(db_session, link_by_id.user_id, column="id")

            return self.encode_jwt(user.id, user.username)

        # if link dont exist - email must be verified
        if not platform_user.get("email_verified"):
            raise HTTPException(status_code=400, detail="Email on platform not verified")
        try:
            link_by_email = await self.link_repo.get_by_email_platform(
                db_session, platform_user.get("email"), Platform(type)
            )
        except NotFoundException:
            link_by_email = None

        # level 2 - another link with email already exists
        if link_by_email:
            if not strtg.allow_email_collision():
                raise HTTPException(status_code=400, detail="Email collision")

            raise NeedConfirmationException(
                data={
                    "user_id": str(link_by_email.user_id),
                    "platform": type,
                    "platform_user_id": platform_user.get("id"),
                    "platform_user_email": platform_user.get("email"),
                    "platform_username": platform_user.get("username"),
                    "platform_avatar_url": platform_user.get("avatar_url"),
                    "access_token": platform_user.get("access_token"),
                    "refresh_token": platform_user.get("refresh_token"),
                    "expires_at": platform_user.get("expires_at"),
                }
            )
        try:
            user_by_email = await self.user_repo.get_one(db_session, platform_user.get("email"), column="email")
        except NotFoundException:
            user_by_email = None

        # level 3 - user with email already exists
        if user_by_email:
            await self.link_repo.create(
                db_session,
                LinkedAccountsCreate(
                    user_id=user_by_email.id,
                    platform=Platform(type),
                    platform_user_id=platform_user.get("id"),
                    platform_username=platform_user.get("username"),
                    platform_avatar_url=platform_user.get("avatar_url"),
                    platform_user_email=platform_user.get("email"),
                    access_token=platform_user.get("access_token"),
                    refresh_token=platform_user.get("refresh_token"),
                    expires_at=platform_user.get("expires_at"),
                ),
            )

            token = self.encode_jwt(user_by_email.id, platform_user.get("username"))
            return token

        # level 4 - new user
        else:
            new_user = await self.user_repo.create(
                db_session,
                AuthUserCreate(
                    username=platform_user.get("username"),
                    email=platform_user.get("email"),
                    avatar_url=platform_user.get("avatar_url"),
                ),
            )

            await self.link_repo.create(
                db_session,
                LinkedAccountsCreate(
                    user_id=new_user.id,
                    platform=Platform(type),
                    platform_user_id=platform_user.get("id"),
                    platform_username=platform_user.get("username"),
                    platform_avatar_url=platform_user.get("avatar_url"),
                    platform_user_email=platform_user.get("email"),
                    access_token=platform_user.get("access_token"),
                    refresh_token=platform_user.get("refresh_token"),
                    expires_at=platform_user.get("expires_at"),
                ),
            )

            token = self.encode_jwt(new_user.id, platform_user.get("username"))
            return token

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
            user: AuthUserSchema = await self.user_repo.get_one(db_session, UUID(user_id))
        except NotFoundException:
            raise HTTPException(status_code=404, detail="User not found")

        return user

    async def add_integration(
        self, db_session: AsyncSession, user_id: UUID, code: str, type: Platform
    ) -> AuthUserSchema:
        strtg = manager.get_strategy(type)
        if strtg is None:
            raise HTTPException(status_code=400, detail="Platform not supported")

        try:
            db_user = await self.user_repo.get_one(db_session, user_id)
            social_user = await strtg.fetch_identity(code)
            integration = find(
                db_user.linked_accounts, lambda x: x.platform == type and x.platform_user_id == social_user["id"]
            )
            if not integration:
                link = LinkedAccountsCreate(
                    user_id=user_id,
                    platform=type,
                    platform_user_id=social_user["id"],
                    platform_user_email=social_user["email"],
                    platform_username=social_user["username"],
                    platform_avatar_url=social_user["avatar_url"],
                    access_token=social_user["access_token"],
                    refresh_token=social_user["refresh_token"],
                    expires_at=social_user["expires_at"],
                )
                await self.link_repo.create(db_session, link)

                return await self.user_repo.get_one(db_session, user_id)

            else:
                raise HTTPException(status_code=400, detail="User already has a da integration")
        except NotFoundException:
            raise HTTPException(status_code=404, detail="User not found")

    async def delete_integration(
        self, db_session: AsyncSession, user_id: UUID, type: Platform, platform_user_id: str
    ) -> AuthUserSchema:
        try:
            db_user = await self.user_repo.get_one(db_session, user_id, column="id")
            da_integration = find(
                db_user.linked_accounts,
                lambda x: x.platform == type and x.platform_user_id == platform_user_id,
            )

            if not da_integration:
                raise HTTPException(status_code=400, detail="User does not have a twitch integration")

            await self.link_repo.remove(db_session, da_integration.id)

            return await self.user_repo.get_one(db_session, db_user.id)
        except NotFoundException:
            raise HTTPException(status_code=404, detail="User not found")

    async def connect_bot(self, db_session: AsyncSession, user: AuthUserSchema, type: Platform) -> None:
        strtg = manager.get_strategy(type)
        if strtg is None:
            raise HTTPException(status_code=400, detail="Platform not supported")

        link = find(user.linked_accounts, lambda x: x.platform == type)
        if not link:
            raise HTTPException(status_code=403, detail="User does not have a needed integration")

        responce = await broker.request(
            LinkedAccountWithTokensRead.model_validate(link),
            strtg.bot_connect_request_queue,
            main_exchange,
        )

        is_connected = bool(await responce.decode())

        if not is_connected:
            raise HTTPException(status_code=500, detail="Failed to connect bot. Try again later.")

        link.bot_connection = is_connected
        await self.link_repo.update(db_session, link)

    async def bot_was_disconnected(self, db_session: AsyncSession, tokens: dict, type: Platform) -> None:
        user = await user_repository.get_by_tokens(db_session, tokens["access_token"], tokens["refresh_token"], type)

        link = find(user.linked_accounts, lambda x: x.platform == type)
        if not link:
            raise HTTPException(status_code=400, detail="User does not have a needed integration")
        link.bot_connection = False

        await self.link_repo.update(db_session, link)


auth_service = AuthService(UserRepository(), LinkedAccountsRepository())
