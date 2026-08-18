import logging
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from src.dal.postgres.twitch_admin_token import (
    TwitchAdminTokenRepository,
    twitch_admin_token_repository,
)
from src.models.twitch_admin_token import (
    TwitchAdminTokenCreate,
    TwitchAdminTokenDomain,
    TwitchAdminTokenUpdate,
)
from src.services.auth.twitch_service import auth_twitch_service

logger = logging.getLogger(__name__)


class TwitchAdminTokenService:
    def __init__(self, repository: TwitchAdminTokenRepository = twitch_admin_token_repository):
        self.repository: TwitchAdminTokenRepository = repository

    async def save_or_update_token(
        self,
        session: AsyncSession,
        data: TwitchAdminTokenCreate,
    ) -> TwitchAdminTokenDomain:
        """Save a new Twitch admin token or update existing token if matching twitch_user_id exists."""
        if data.twitch_user_id:
            existing = await self.repository.get_by_twitch_user_id(session, data.twitch_user_id)
            if existing:
                update_dto = TwitchAdminTokenUpdate(
                    access_token=data.access_token,
                    refresh_token=data.refresh_token or existing.refresh_token,
                    token_type=data.token_type,
                    expires_in=data.expires_in,
                    expires_at=data.expires_at,
                    scope=data.scope,
                    is_active=True,
                )
                return await self.repository.update(session, existing.id, update_dto)

        return await self.repository.create(session, data)

    async def fetch_tokens_to_refresh(self, session: AsyncSession) -> list[TwitchAdminTokenDomain]:
        """Fetch active Twitch admin tokens that expire within 30 minutes or have no expiration date set."""
        return await self.repository.fetch_tokens_to_refresh(session)

    async def fetch_all_active_tokens(self, session: AsyncSession) -> list[TwitchAdminTokenDomain]:
        """Fetch all active Twitch admin tokens."""
        return await self.repository.fetch_all_active_tokens(session)

    async def get_active_tokens(self, session: AsyncSession) -> list[TwitchAdminTokenDomain]:
        """Alias for fetch_all_active_tokens."""
        return await self.repository.fetch_all_active_tokens(session)

    async def get_token_by_user_id(self, session: AsyncSession, twitch_user_id: str) -> TwitchAdminTokenDomain | None:
        """Fetch active token by twitch_user_id."""
        return await self.repository.get_by_twitch_user_id(session, twitch_user_id)

    async def update_token(
        self, session: AsyncSession, token_id: int, data: TwitchAdminTokenUpdate
    ) -> TwitchAdminTokenDomain:
        """Update TwitchAdminToken."""
        return await self.repository.update(session, token_id, data)

    async def refresh_token(self, token: TwitchAdminTokenDomain, session: AsyncSession) -> bool:
        """Refresh a single TwitchAdminToken using Twitch OAuth API and update DB via repository."""
        if not token.refresh_token:
            logger.warning(f"TwitchAdminTokenDomain {token.id} has no refresh_token.")
            return False

        try:
            fresh_tokens = await auth_twitch_service.refresh_token(token.refresh_token)

            now = datetime.now(UTC)
            expires_at = now + timedelta(seconds=fresh_tokens.expires_in) if fresh_tokens.expires_in else token.expires_at

            update_dto = TwitchAdminTokenUpdate(
                access_token=fresh_tokens.access_token,
                refresh_token=fresh_tokens.refresh_token or token.refresh_token,
                token_type=fresh_tokens.token_type or token.token_type,
                expires_in=fresh_tokens.expires_in or token.expires_in,
                expires_at=expires_at,
                scope=fresh_tokens.scope if isinstance(fresh_tokens.scope, list) and fresh_tokens.scope else token.scope,
                is_active=True,
            )

            await self.repository.update(session, token.id, update_dto)
            logger.info(f"Successfully refreshed TwitchAdminToken for user '{token.twitch_username}' (ID: {token.id}).")
            return True

        except HTTPException as http_ex:
            logger.error(
                f"HTTP error refreshing TwitchAdminToken {token.id}: status={http_ex.status_code}, detail={http_ex.detail}"
            )
            if http_ex.status_code in (400, 401):
                await self.repository.update(session, token.id, TwitchAdminTokenUpdate(is_active=False))
            return False
        except Exception as ex:
            logger.error(f"Failed to refresh TwitchAdminToken {token.id}: {ex}")
            return False


twitch_admin_token_service = TwitchAdminTokenService()
