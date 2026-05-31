from datetime import datetime
from typing import Annotated
from uuid import UUID
import uuid

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from fastapi.security import APIKeyCookie
from fastapi import Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from simple_repository.exceptions import NotFoundException

from tasks.email import send_email

from adapters._redis.broker import get_broker
from adapters._rabbit.event_broker import (
    broker,
    main_exchange,
)
from dal.postgres_impl import TokenVaultRepository, LinkedAccountsRepository, UserRepository, user_repository
from models.token_vault import TokenVaultCreate, TokenVaultDomain
from models.auth_user import AuthUserSchema, AuthUserCreate
from models.linked_accounts import LinkedAccountsCreate, LinkedAccountsDomain
from services.auth.strategy_manager import manager
from services.tokens.token_service import token_service

from _types import Platform
from database import get_async_session
from settings import settings
from exceptions import NeedConfirmationException


from utils import find

security_scheme = APIKeyCookie(name=settings.COOKIE_NAME)


class AuthService:
    def __init__(
        self, user_repo: UserRepository, link_repo: LinkedAccountsRepository, token_vault_repo: TokenVaultRepository
    ):
        self.user_repo: UserRepository = user_repo
        self.link_repo: LinkedAccountsRepository = link_repo
        self.token_vault_repo: TokenVaultRepository = token_vault_repo
        self.hasher = PasswordHasher()

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

    async def login_classic(self, db_session: AsyncSession, email: str, password: str) -> str:

        try:
            user = await self.user_repo.get_one(db_session, email, column="email")
            if not user.password:
                raise HTTPException(status_code=400, detail="Wrong password or email")

            self.hasher.verify(user.password, password)

            if self.hasher.check_needs_rehash(user.password):
                user.password = self.hasher.hash(password)
                await self.user_repo.update(db_session, user)

        except (VerifyMismatchError, NotFoundException):
            raise HTTPException(status_code=400, detail="Wrong password or email")

        return self.encode_jwt(user.id, user.username)

    async def set_up_email_confirm(self, email: str, session_id: str | None = None) -> None:
        if not session_id:
            session_id = str(uuid.uuid4())

        get_broker().set(
            f"email_comfirmation:{email}:{session_id}",
            True,
            ex=600,
        )
        await send_email.kiq(
            email,
            "Open Playlist - Confirm email",
            "<p>Please confirm your email by clicking the link below.</p> "
            f"<p><a href='{settings.EMAIL_COMFIRM_ADRESS}?email={email}&session_id={session_id}'>Confirm email</a></p>",
        )

    async def register_classic(self, db_session: AsyncSession, username: str, email: str, password: str) -> None:
        try:
            await self.user_repo.get_one(db_session, email, column="email")
            raise HTTPException(status_code=400, detail="Email already exists")

        except NotFoundException:
            session_id = str(uuid.uuid4())
            new_user = AuthUserCreate(
                username=username,
                email=email,
                password=self.hasher.hash(password),
            )

            get_broker().set(
                f"email_new_user_data:{email}:{session_id}",
                str(new_user.model_dump_json()),
                ex=600,
            )
            await self.set_up_email_confirm(email, session_id)

        return None

    async def confirm_email(self, db_session: AsyncSession, email: str, session_id: UUID) -> str:
        is_exists = bool(get_broker().getdel(f"email_comfirmation:{email}:{session_id}"))
        if not is_exists:
            raise HTTPException(status_code=403, detail="Session expired")

        try:
            user = await self.user_repo.get_one(db_session, email, column="email")
            user.email_confirmed = True
            await self.user_repo.update(db_session, user)
            return self.encode_jwt(user.id, user.username)
        except NotFoundException:
            raise HTTPException(status_code=400, detail="User not found")

    async def confirm_account_merge(self, db_session: AsyncSession, data: dict) -> str:

        link = await self.link_repo.create(
            db_session,
            LinkedAccountsCreate.model_validate(data),
        )
        await self.token_vault_repo.create(
            db_session,
            TokenVaultCreate(
                user_id=data["user_id"],
                linked_account_id=link.id,
                platform=data["platform"],
                platform_user_id=data["platform_user_id"],
                access_token=data["access_token"],
                refresh_token=data["refresh_token"],
                token_type=data["token_type"],
                expires_at=data["expires_at"],
            ),
        )

        user = await self.user_repo.get_one(db_session, data["user_id"], column="id")
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
        # level 1 - link with id already exists
        try:
            link_by_id = await self.link_repo.get_one(db_session, platform_user.get("id"), column="platform_user_id")

            await token_service.update_tokens(
                db_session,
                link_by_id.id,
                platform_user.get("access_token"),
                platform_user.get("refresh_token"),
                platform_user.get("expires_at"),
            )

            link_by_id = await self.link_repo.update(db_session, link_by_id)

            user = await self.user_repo.get_one(db_session, link_by_id.user_id, column="id")

            return self.encode_jwt(user.id, user.username)
        except NotFoundException:
            ...

        # if link dont exist - email must be verified
        if not platform_user.get("email_verified"):
            raise HTTPException(status_code=400, detail="Email on platform not verified")

        # level 2 - another link with email already exists
        try:
            link_by_email = await self.link_repo.get_by_email_platform(
                db_session, platform_user.get("email"), Platform(type)
            )

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
        except NotFoundException:
            ...

        try:
            # level 3 - user with email already exists
            user = await self.user_repo.get_one(db_session, platform_user.get("email"), column="email")
        except NotFoundException:
            # level 4 - completly new user
            user = await self.create_user(
                db_session,
                AuthUserCreate(
                    username=platform_user.get("username"),
                    email=platform_user.get("email"),
                    email_confirmed=True,
                    avatar_url=platform_user.get("avatar_url"),
                ),
            )

        new_link = await self.create_link(
            db_session,
            LinkedAccountsCreate(
                user_id=user.id,
                platform=Platform(type),
                platform_user_id=platform_user.get("id"),
                platform_username=platform_user.get("username"),
                platform_avatar_url=platform_user.get("avatar_url"),
                platform_user_email=platform_user.get("email"),
            ),
        )

        await self.token_vault_repo.create(
            db_session,
            TokenVaultCreate(
                user_id=user.id,
                linked_account_id=new_link.id,
                platform=Platform(type),
                token_type="Bearer",
                platform_user_id=platform_user.get("id"),
                access_token=platform_user.get("access_token"),
                refresh_token=platform_user.get("refresh_token"),
                expires_at=platform_user.get("expires_at"),
            ),
        )

        token = self.encode_jwt(user.id, platform_user.get("username"))
        return token

    async def get_all_tokens(self, db_session: AsyncSession, type: Platform) -> list[TokenVaultDomain]:
        return await self.token_vault_repo.get_all_by_platform(db_session, type)

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

    async def create_user(self, db_session: AsyncSession, user: AuthUserCreate) -> AuthUserSchema:
        return await self.user_repo.create(db_session, user)

    async def create_link(self, db_session: AsyncSession, link: LinkedAccountsCreate) -> LinkedAccountsDomain:
        return await self.link_repo.create(db_session, link)

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
                )

                new_link = await self.link_repo.create(db_session, link)
                await self.token_vault_repo.create(
                    db_session,
                    TokenVaultCreate(
                        user_id=user_id,
                        linked_account_id=new_link.id,
                        platform=type,
                        token_type="Bearer",
                        platform_user_id=social_user["id"],
                        access_token=social_user["access_token"],
                        refresh_token=social_user["refresh_token"],
                        expires_at=social_user["expires_at"],
                    ),
                )
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
            integration = find(
                db_user.linked_accounts,
                lambda x: x.platform == Platform(type) and x.platform_user_id == platform_user_id,
            )
            for link in db_user.linked_accounts:
                if link.platform == Platform(type) and link.platform_user_id == platform_user_id:
                    print(link)
            print(f"type: {type}, platform_user_id: {platform_user_id}")
            if not integration:
                raise HTTPException(status_code=400, detail=f"User does not have a {type} integration")

            await self.link_repo.remove(db_session, integration.id)

            return await self.user_repo.get_one(db_session, db_user.id)
        except NotFoundException:
            raise HTTPException(status_code=404, detail="User not found")

    async def connect_bot(
        self, db_session: AsyncSession, user: AuthUserSchema, type: Platform, platform_user_id: str
    ) -> None:
        strtg = manager.get_strategy(type)
        if strtg is None:
            raise HTTPException(status_code=400, detail="Platform not supported")

        link = find(user.linked_accounts, lambda x: x.platform == type and x.platform_user_id == platform_user_id)
        if not link:
            raise HTTPException(status_code=403, detail="User does not have a needed integration")

        tokens = await token_service.get(db_session, link.id)
        responce = await broker.request(
            {
                "access_token": tokens.access_token,
                "refresh_token": tokens.refresh_token,
                "expires_at": tokens.expires_at,
                "platform": tokens.platform,
                "platform_user_id": tokens.platform_user_id,
                "user_id": str(tokens.user_id),
            },
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


auth_service = AuthService(UserRepository(), LinkedAccountsRepository(), TokenVaultRepository())
