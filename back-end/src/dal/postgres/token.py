from datetime import datetime

from simple_repository import crud_factory
from simple_repository.exceptions import NotFoundException

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


from src.orm.token_vault import TokenVault
from src.models.token_vault import TokenVaultCreate, TokenVaultUpdate, TokenVaultDomain


from src._types import Platform


class TokenVaultRepository(crud_factory(TokenVault, TokenVaultDomain, TokenVaultCreate, TokenVaultUpdate)):
    def to_inner(self, data: TokenVaultCreate | TokenVaultDomain | TokenVaultUpdate) -> dict:
        return data.model_dump(exclude_unset=True)

    def to_repr(self, object: TokenVault) -> TokenVaultDomain:
        return self.domain_model.model_validate(object)

    async def get_by_id_platform(self, session: AsyncSession, platform_user_id: str, platform: Platform):
        stmt = select(TokenVault).where(
            TokenVault.platform_user_id == platform_user_id, TokenVault.platform == platform
        )

        res = await session.execute(stmt)
        tokens = res.unique().scalars().one_or_none()

        if not tokens:
            raise NotFoundException(
                f"{self.sqla_model.__tablename__} with platform_user_id={platform_user_id} and platform={platform} not found"
            )

        return TokenVaultDomain.model_validate(tokens)

    async def fetch_tokens_to_refresh(self, session: AsyncSession) -> list[TokenVaultDomain]:
        stmt = select(TokenVault).where(TokenVault.expires_at < int(datetime.now().timestamp()) - 60 * 60 * 2)

        result = await session.execute(stmt)
        result = result.unique().scalars().all()

        return [self.to_repr(item) for item in result]

    async def get_all_by_platform(self, session: AsyncSession, platform: Platform) -> list[TokenVaultDomain]:
        stmt = select(TokenVault).where(TokenVault.platform == platform)

        result = await session.execute(stmt)
        result = result.unique().scalars().all()

        return [self.to_repr(item) for item in result]


token_vault_repository = TokenVaultRepository()
