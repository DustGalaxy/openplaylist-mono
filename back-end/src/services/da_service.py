import json
import logging
from datetime import datetime
from uuid import UUID

import httpx
import jwt
from fastapi import HTTPException
from simple_repository.exceptions import NotFoundException

from _types import AsyncSession, Platform
from config import settings
from dto.da import DAToken, DAUser
from models.auth_user import AuthUserCreate, AuthUserDomain, AuthUserUpdate
from models.linked_accounts import LinkedAccountsCreate, LinkedAccountsUpdate
from repo import LinkedAccountsRepository, UserRepository
from utils import find

logger = logging.getLogger(__name__)


class AuthDAService:
    def __init__(self, user_repo: UserRepository, link_repo: LinkedAccountsRepository):
        self.user_repo = user_repo
        self.link_repo = link_repo
        self.platform = Platform.DA

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

    async def refresh_token(self, refresh_token: str):
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
                new_token_data = DAToken.model_validate(response.json())
                if not new_token_data.refresh_token:
                    new_token_data.refresh_token = refresh_token

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

    async def login(self, db_session: AsyncSession, code: str):
        try:
            token_data = await self.get_token(code)
            da_user = await self.get_data(token_data.access_token)

            try:
                db_user = await self.user_repo.get_user_by_link(db_session, self.platform, da_user.id)
                db_user = await self.user_repo.patch(
                    db_session, AuthUserUpdate(main_platform=self.platform, last_login=datetime.now()), db_user.id
                )
                await self.link_repo.patch(
                    db_session,
                    LinkedAccountsUpdate(
                        platform_avatar_url=da_user.avatar,
                        platform_username=da_user.name,
                        access_token=token_data.access_token,
                        refresh_token=token_data.refresh_token,
                        expires_at=token_data.expires_at,
                    ),
                    find(db_user.linked_accounts, lambda x: x.platform == self.platform).id,  # pyright: ignore[reportOptionalMemberAccess]
                )
            except NotFoundException:
                db_user = await self.register(
                    db_session,
                    da_user,
                    token_data.access_token,
                    token_data.refresh_token,  # type: ignore
                    token_data.expires_in,
                )

            return self.encode_jwt(db_user.id, da_user.name)

        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP Error exchanging code for token: {e.response.status_code} - {e.response.text}")
            raise HTTPException(status_code=400)

        except httpx.RequestError as e:
            logger.error(f"Network error exchanging code for token: {e}")
            raise HTTPException(status_code=400)

        except json.JSONDecodeError as e:
            logger.error(f"Failed to decode JSON token response: {e}")
            raise HTTPException(status_code=400)

    async def register(
        self,
        db_session: AsyncSession,
        da_user: DAUser,
        access_token: str,
        refresh_token: str,
        expires_in: int,
    ):
        db_user: AuthUserDomain = await self.user_repo.create(
            db_session,
            AuthUserCreate(
                last_login=datetime.now(),
                username=da_user.name,
                main_platform=self.platform,
            ),
        )
        db_link = await self.link_repo.create(
            db_session,
            LinkedAccountsCreate(
                user_id=db_user.id,
                platform=self.platform,
                platform_user_id=da_user.id,
                platform_username=da_user.name,
                platform_avatar_url=da_user.avatar,
                access_token=access_token,
                refresh_token=refresh_token,
                expires_at=expires_in,
            ),
        )

        db_user.linked_accounts.append(db_link)
        return db_user

    async def add_integration(self, db_session: AsyncSession, user_id: UUID, code: str) -> AuthUserDomain:
        try:
            db_user = await self.user_repo.get_one(db_session, user_id, column="id")
            print(db_user)
            integration = find(db_user.linked_accounts, lambda x: x.platform == self.platform)
            if not integration:
                data = {
                    "grant_type": "authorization_code",
                    "client_id": settings.DA_APP_ID,
                    "client_secret": settings.DA_API_KEY,
                    "code": code,
                    "redirect_uri": settings.DA_REDIRECT_URI,
                }
                async with httpx.AsyncClient() as client:
                    try:
                        response = await client.post(settings.DA_TOKEN_URL, data=data)
                        response.raise_for_status()
                        token_data = response.json()
                        user_info: dict = await self._make_api_request("GET", "/user/oauth", token_data["access_token"])

                        data = user_info["data"]
                        data["id"] = str(data["id"])
                        da_user = DAUser.model_validate(data)
                        link = LinkedAccountsCreate(
                            user_id=user_id,
                            platform=self.platform,
                            platform_user_id=da_user.id,
                            platform_username=da_user.name,
                            platform_avatar_url=da_user.avatar,
                            access_token=token_data["access_token"],
                            refresh_token=token_data["refresh_token"],
                            expires_at=int(datetime.now().timestamp()) + token_data["expires_in"],
                        )

                        db_link = await self.link_repo.create(db_session, link)
                        db_user.linked_accounts.append(db_link)
                        return db_user

                    except httpx.HTTPStatusError as e:
                        logger.error(
                            f"HTTP Error exchanging code for token: {e.response.status_code} - {e.response.text}"
                        )
                        raise HTTPException(status_code=400)

                    except httpx.RequestError as e:
                        logger.error(f"Network error exchanging code for token: {e}")
                        raise HTTPException(status_code=400)

                    except json.JSONDecodeError as e:
                        logger.error(f"Failed to decode JSON token response: {e}")
                        raise HTTPException(status_code=400)
            else:
                raise HTTPException(status_code=400, detail="User already has a da integration")
        except NotFoundException:
            raise HTTPException(status_code=404, detail="User not found")

    async def delete_integration(self, db_session: AsyncSession, user_id: UUID) -> AuthUserDomain:
        try:
            db_user = await self.user_repo.get_one(db_session, user_id, column="id")
            da_acc = find(db_user.linked_accounts, lambda x: x.platform == self.platform)

            if not da_acc:
                raise HTTPException(status_code=400, detail="User does not have a twitch integration")

            await self.link_repo.remove(db_session, da_acc.id)

            return await self.user_repo.update(db_session, db_user)
        except NotFoundException:
            raise HTTPException(status_code=404, detail="User not found")


auth_da_service = AuthDAService(UserRepository(), LinkedAccountsRepository())
