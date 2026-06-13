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

from src.tasks.email import send_email

from src.adapters._rabbit.event_broker import (
    broker,
    main_exchange,
)
from src.dal._redis.broker import get_broker
from src.dal.postgres.token import TokenVaultRepository
from src.dal.postgres.linked_account import LinkedAccountsRepository
from src.dal.postgres.user import UserRepository, user_repository
from src.dal.postgres.playlist import playlist_repository

from src.models.token_vault import TokenVaultCreate, TokenVaultDomain
from src.models.auth_user import AuthUserSchema, AuthUserCreate
from src.models.linked_accounts import LinkedAccountsCreate, LinkedAccountsDomain

from src.services.auth.strategy_manager import manager
from src.services.tokens.token_service import token_service

from src._types import AuthFlow, IntegrationPlatform
from src.database import get_async_session
from src.settings import settings
from src.exceptions import NeedConfirmationException

from src.utils import find

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
                linked_account_id=link.id,
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
        platform: IntegrationPlatform,
        code_verifier: str | None = None,
    ) -> str:
        strtg = manager.get(platform)

        if not manager.supports_identity(platform):
            raise HTTPException(400, f"{platform} does not support login")

        result = await strtg.fetch_identity(code, code_verifier)
        platform_user = result.user
        platform_tokens = result.tokens

        # level 1 - link with id already exists
        try:
            link_by_id = await self.link_repo.get_one(db_session, platform_user.id, column="platform_user_id")

            await token_service.update_tokens(
                db_session,
                link_by_id.id,
                access_token=platform_tokens.access_token,
                refresh_token=platform_tokens.refresh_token,
                expires_at=platform_tokens.expires_at,
            )

            link_by_id.platform_username = platform_user.username
            link_by_id.platform_avatar_url = platform_user.avatar_url
            link_by_id.platform_user_email = platform_user.email
            link_by_id = await self.link_repo.update(db_session, link_by_id)

            user = await self.user_repo.get_one(db_session, link_by_id.user_id, column="id")

            return self.encode_jwt(user.id, user.username)
        except NotFoundException:
            ...

        # if link dont exist - email must be verified
        if not platform_user.email_verified or not platform_user.email:
            raise HTTPException(
                status_code=400,
                detail="Email on platform not verified or not provided. Please verify or register with another platform.",
            )

        # level 2 - another link with email already exists
        try:
            link_by_email = await self.link_repo.get_by_email_platform(
                db_session, platform_user.email, IntegrationPlatform(type)
            )

            if not strtg.meta.allow_email_collision:
                raise HTTPException(status_code=400, detail="Email collision")

            raise NeedConfirmationException(
                data={
                    "user_id": str(link_by_email.user_id),
                    "platform": type,
                    "platform_user_id": platform_user.id,
                    "platform_user_email": platform_user.email,
                    "platform_username": platform_user.username,
                    "platform_avatar_url": platform_user.avatar_url,
                    "access_token": platform_tokens.access_token,
                    "refresh_token": platform_tokens.refresh_token,
                    "expires_at": platform_tokens.expires_at,
                }
            )
        except NotFoundException:
            ...

        try:
            # level 3 - user with email already exists
            user = await self.user_repo.get_one(db_session, platform_user.email, column="email")
        except NotFoundException:
            # level 4 - completly new user
            user = await self.create_user(
                db_session,
                AuthUserCreate(
                    username=platform_user.username,
                    email=platform_user.email,
                    email_confirmed=platform_user.email_verified,
                    avatar_url=platform_user.avatar_url,
                ),
            )

        new_link = await self.create_link(
            db_session,
            LinkedAccountsCreate(
                user_id=user.id,
                platform=IntegrationPlatform(type),
                platform_user_id=platform_user.id,
                platform_username=platform_user.username,
                platform_avatar_url=platform_user.avatar_url,
                platform_user_email=platform_user.email,
            ),
        )

        await self.token_vault_repo.create(
            db_session,
            TokenVaultCreate(
                linked_account_id=new_link.id,
                token_type="Bearer",
                access_token=platform_tokens.access_token,
                refresh_token=platform_tokens.refresh_token,
                expires_at=platform_tokens.expires_at,
            ),
        )

        token = self.encode_jwt(user.id, platform_user.username)
        return token

    async def get_all_tokens(self, db_session: AsyncSession, type: IntegrationPlatform) -> list[TokenVaultDomain]:
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
        self,
        db_session: AsyncSession,
        user_id: UUID,
        platform: IntegrationPlatform,
        code: str | None = None,
        code_verifier: str | None = None,
        user_key: str | None = None,
    ) -> AuthUserSchema:
        strtg = manager.get(platform)
        if strtg.meta.auth_flow == AuthFlow.USER_KEY:
            if not user_key:
                raise HTTPException(400, "This platform requires a personal token")
            result = await strtg.fetch_identity(user_key=user_key)

        elif strtg.meta.auth_flow == AuthFlow.PKCE:
            if not code or not code_verifier:
                raise HTTPException(400, "code and code_verifier are required for PKCE flow")
            result = await strtg.fetch_identity(code=code, code_verifier=code_verifier)

        else:  # AUTH_CODE
            if not code:
                raise HTTPException(400, "code is required")
            result = await strtg.fetch_identity(code=code)

        try:
            db_user = await self.user_repo.get_one(db_session, user_id)
        except NotFoundException:
            raise HTTPException(404, "User not found")

        # проверяем что такой интеграции ещё нет
        existing = find(
            db_user.linked_accounts,
            lambda x: x.platform == platform and x.platform_user_id == result.user.id,
        )
        if existing:
            raise HTTPException(400, f"User already has a {platform} integration")

        # создаём линк и токен
        new_link = await self.create_link(
            db_session,
            LinkedAccountsCreate(
                user_id=user_id,
                platform=platform,
                platform_user_id=result.user.id,
                platform_username=result.user.username,
                platform_avatar_url=result.user.avatar_url,
                platform_user_email=result.user.email,
            ),
        )

        await self.token_vault_repo.create(
            db_session,
            TokenVaultCreate(
                linked_account_id=new_link.id,
                token_type=result.tokens.token_type,
                access_token=result.tokens.access_token,
                refresh_token=result.tokens.refresh_token,
                expires_at=result.tokens.expires_at,
            ),
        )

        return await self.user_repo.get_one(db_session, user_id)

    async def delete_integration(
        self, db_session: AsyncSession, user_id: UUID, type: IntegrationPlatform, platform_user_id: str
    ) -> AuthUserSchema:
        try:
            db_user = await self.user_repo.get_one(db_session, user_id, column="id")
            integration = find(
                db_user.linked_accounts,
                lambda x: x.platform == IntegrationPlatform(type) and x.platform_user_id == platform_user_id,
            )
            for link in db_user.linked_accounts:
                if link.platform == IntegrationPlatform(type) and link.platform_user_id == platform_user_id:
                    print(link)
            print(f"type: {type}, platform_user_id: {platform_user_id}")
            if not integration:
                raise HTTPException(status_code=400, detail=f"User does not have a {type} integration")

            await self.link_repo.remove(db_session, integration.id)

            return await self.user_repo.get_one(db_session, db_user.id)
        except NotFoundException:
            raise HTTPException(status_code=404, detail="User not found")

    async def connect_bot(
        self,
        db_session: AsyncSession,
        user: AuthUserSchema,
        platform: IntegrationPlatform,
        platform_user_id: str,
    ) -> None:
        strtg = manager.get(platform)

        if not manager.supports_bot(platform):
            raise HTTPException(400, f"{platform} does not support bot")

        link = find(
            user.linked_accounts,
            lambda x: x.platform == platform and x.platform_user_id == platform_user_id,
        )
        if not link:
            raise HTTPException(403, "User does not have a needed integration")

        queue = strtg.get_bot_queue()
        if queue is None:
            raise HTTPException(500, f"Bot queue not configured for {platform}")

        tokens = await self.token_vault_repo.get_by_id_link(db_session, link.id)

        response = await broker.request(
            {
                "access_token": tokens.access_token,
                "refresh_token": tokens.refresh_token,
                "expires_at": tokens.expires_at,
                "platform": platform.value,
                "platform_user_id": platform_user_id,
                "user_id": str(user.id),
            },
            queue,
            main_exchange,
        )

        is_connected = bool(await response.decode())
        if not is_connected:
            raise HTTPException(500, "Failed to connect bot. Try again later.")

        link.bot_connection = True
        await self.link_repo.update(db_session, link)

    async def bot_was_disconnected(
        self,
        db_session: AsyncSession,
        platform: IntegrationPlatform,
        platform_user_id: str,
    ) -> None:
        link = await self.link_repo.get_by_id_platform(
            db_session,
            platform=platform,
            platform_user_id=platform_user_id,
        )
        if not link:
            raise HTTPException(400, "Integration not found")

        link.bot_connection = False
        await self.link_repo.update(db_session, link)

    async def delete_user(self, db_session: AsyncSession, user_id: UUID) -> None:
        await playlist_repository.remove_many(db_session, [user_id], column="owner_id")
        await self.token_vault_repo.remove_many(db_session, [user_id], column="user_id")
        await self.link_repo.remove_many(db_session, [user_id], column="user_id")
        await self.user_repo.remove(db_session, user_id)


auth_service = AuthService(UserRepository(), LinkedAccountsRepository(), TokenVaultRepository())
