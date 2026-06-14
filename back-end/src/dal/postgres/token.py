from datetime import datetime
from uuid import UUID

from simple_repository import crud_factory
from simple_repository.exceptions import NotFoundException

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


from src.orm.token_vault import TokenVault
from src.models.token_vault import TokenVaultCreate, TokenVaultUpdate, TokenVaultDomain
from src.orm.linked_accounts import LinkedAccounts

from src._types import IntegrationPlatform


class TokenVaultRepository(crud_factory(TokenVault, TokenVaultDomain, TokenVaultCreate, TokenVaultUpdate)):
    def to_inner(self, data: TokenVaultCreate | TokenVaultDomain | TokenVaultUpdate) -> dict:
        return data.model_dump(exclude_unset=True)

    def to_repr(self, object: TokenVault) -> TokenVaultDomain:
        return self.domain_model.model_validate(object)

    async def get_by_id_link(self, session: AsyncSession, link_id: UUID) -> TokenVaultDomain:
        stmt = select(TokenVault).where(TokenVault.linked_account_id == link_id)

        res = await session.execute(stmt)
        tokens = res.unique().scalars().one_or_none()

        if not tokens:
            raise NotFoundException(f"{self.sqla_model.__tablename__} with link_id={link_id} not found")

        return TokenVaultDomain.model_validate(tokens)

    async def fetch_tokens_to_refresh(self, session: AsyncSession) -> list[TokenVaultDomain]:
        stmt = select(TokenVault).where(TokenVault.expires_at < int(datetime.now().timestamp()) - 60 * 60 * 2)

        result = await session.execute(stmt)
        result = result.unique().scalars().all()

        return [self.to_repr(item) for item in result]

    async def get_all_by_platform(self, session: AsyncSession, platform: IntegrationPlatform) -> list[TokenVaultDomain]:
        stmt = (
            select(TokenVault)
            .join(LinkedAccounts, TokenVault.linked_account_id == LinkedAccounts.id)
            .where(LinkedAccounts.platform == platform)
        )

        result = await session.execute(stmt)
        result = result.unique().scalars().all()

        return [self.to_repr(item) for item in result]

    async def get_for_bots(self, session: AsyncSession, platform: IntegrationPlatform) -> list[TokenVaultDomain]:
        stmt = (
            select(TokenVault)
            .join(LinkedAccounts, TokenVault.linked_account_id == LinkedAccounts.id)
            .where(LinkedAccounts.platform == platform, LinkedAccounts.bot_connection == True)
        )

        result = await session.execute(stmt)
        result = result.unique().scalars().all()

        return [self.to_repr(item) for item in result]


token_vault_repository = TokenVaultRepository()
