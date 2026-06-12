from datetime import datetime
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.models.token_vault import TokenVaultCreate, TokenVaultDomain
from src.dal.postgres.token import token_vault_repository, TokenVaultRepository

from src.services.tokens.manager import manager
from src.database import async_session_maker
from src._types import IntegrationPlatform


class TokenService:
    def __init__(self, token_repository: TokenVaultRepository):
        self.token_repository: TokenVaultRepository = token_repository
        self.strategy_manager = manager

    async def create(
        self,
        db_session: AsyncSession,
        user_id: UUID,
        linked_account_id: UUID,
        platform: IntegrationPlatform,
        platform_user_id: str,
        token_type: str,
        access_token: str,
        refresh_token: str,
        expires_at: int,
    ) -> TokenVaultDomain:
        data = TokenVaultCreate(
            user_id=user_id,
            linked_account_id=linked_account_id,
            platform=platform,
            platform_user_id=platform_user_id,
            token_type=token_type,
            access_token=access_token,
            refresh_token=refresh_token,
            expires_at=expires_at,
        )
        return await self.token_repository.create(db_session, data)

    async def get(self, db_session: AsyncSession, linked_account_id: UUID) -> TokenVaultDomain:
        return await self.token_repository.get_one(db_session, linked_account_id, column="linked_account_id")

    async def update_tokens(
        self, db_session: AsyncSession, linked_account_id: UUID, access_token: str, refresh_token: str, expires_at: int
    ) -> TokenVaultDomain:
        tokens = await self.token_repository.get_one(db_session, linked_account_id, column="linked_account_id")
        tokens.access_token = access_token
        tokens.refresh_token = refresh_token
        tokens.expires_at = expires_at
        tokens.last_update = datetime.now()
        return await self.token_repository.update(db_session, tokens)

    async def refresh_token(self, token_vault: TokenVaultDomain) -> TokenVaultDomain:
        strategy = self.strategy_manager.get_strategy(token_vault.platform)

        tokens = await strategy.refresh_token(token_vault.refresh_token)

        token_vault.access_token = tokens.access_token
        token_vault.refresh_token = tokens.refresh_token
        token_vault.token_type = tokens.token_type
        token_vault.expires_at = tokens.expires_in + int(datetime.now().timestamp())
        token_vault.last_update = datetime.now()

        async with async_session_maker() as session:
            token_vault = await self.token_repository.update(session, token_vault)

        return token_vault

    async def fetch_tokens_to_refresh(self, db_session: AsyncSession) -> list[TokenVaultDomain]:
        return await self.token_repository.fetch_tokens_to_refresh(db_session)


token_service = TokenService(token_vault_repository)
