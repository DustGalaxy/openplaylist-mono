from uuid import UUID

from simple_repository import crud_factory
from simple_repository.exceptions import NotFoundException

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.linked_accounts import LinkedAccountsDomain, LinkedAccountsCreate, LinkedAccountsUpdate
from src.orm.linked_accounts import LinkedAccounts

from src._types import IntegrationPlatform


class LinkedAccountsRepository(
    crud_factory(LinkedAccounts, LinkedAccountsDomain, LinkedAccountsCreate, LinkedAccountsUpdate)
):
    def to_inner(self, data: LinkedAccountsCreate | LinkedAccountsDomain | LinkedAccountsUpdate) -> dict:
        return data.model_dump(exclude_unset=True)

    def to_repr(self, object: LinkedAccounts) -> LinkedAccountsDomain:
        return self.domain_model.model_validate(object)

    async def get_by_id_platform(
        self, session: AsyncSession, user_id: UUID, platform: IntegrationPlatform
    ) -> LinkedAccountsDomain:
        stmt = select(LinkedAccounts).where(
            LinkedAccounts.platform_user_id == user_id, LinkedAccounts.platform == platform
        )

        res = await session.execute(stmt)
        user = res.unique().scalars().one_or_none()

        if not user:
            raise NotFoundException(
                f"{self.sqla_model.__tablename__} with user_id={user_id} and platform={platform} not found"
            )

        return LinkedAccountsDomain.model_validate(user)

    async def get_by_email_platform(self, session: AsyncSession, email: str, platform: IntegrationPlatform):
        stmt = select(LinkedAccounts).where(
            LinkedAccounts.platform_user_email == email, LinkedAccounts.platform == platform
        )

        res = await session.execute(stmt)
        user = res.unique().scalars().one_or_none()

        if not user:
            raise NotFoundException(
                f"{self.sqla_model.__tablename__} with email={email} and platform={platform} not found"
            )

        return LinkedAccountsDomain.model_validate(user)


linked_accounts_repository = LinkedAccountsRepository()
