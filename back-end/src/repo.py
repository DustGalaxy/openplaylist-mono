from simple_repository import crud_factory
from simple_repository._types import IdValue
from simple_repository.exceptions import NotFoundException, IntegrityConflictException, RepositoryException

from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from models.auth_user import AuthUserSchema, AuthUserCreate, AuthUserUpdate
from orm.auth_user import User

from models.linked_accounts import LinkedAccountsDomain, LinkedAccountsCreate, LinkedAccountsUpdate
from orm.linked_accounts import LinkedAccounts

from _types import Platform


class UserRepository(crud_factory(User, AuthUserSchema, AuthUserCreate, AuthUserUpdate)):
    def to_inner(self, data: AuthUserCreate | AuthUserSchema | AuthUserUpdate) -> dict:
        return data.model_dump(exclude_unset=True)

    def to_repr(self, object: User) -> AuthUserSchema:
        return self.domain_model.model_validate(object)

    async def get_user_by_link(
        self, session: AsyncSession, platform: Platform, platform_user_id: str
    ) -> AuthUserSchema:
        stmt = (
            select(User)
            .join(LinkedAccounts)
            .where(LinkedAccounts.platform == platform, LinkedAccounts.platform_user_id == platform_user_id)
        )
        res = await session.execute(stmt)
        user = res.unique().scalars().one_or_none()

        if not user:
            raise NotFoundException(
                f"{self.sqla_model.__tablename__} with platform_user_id={platform_user_id} and platform={platform} not found"
            )

        return AuthUserSchema.model_validate(user)

    async def get_by_tokens(self, session, access_token: str, refresh_token: str, platform: Platform):
        stmt = (
            select(User)
            .join(LinkedAccounts)
            .where(
                LinkedAccounts.access_token == access_token,
                LinkedAccounts.refresh_token == refresh_token,
                LinkedAccounts.platform == platform,
            )
        )
        res = await session.execute(stmt)
        user = res.unique().scalars().one_or_none()
        if not user:
            raise NotFoundException()

        return AuthUserSchema.model_validate(user)

    async def patch(
        self,
        session: AsyncSession,
        data: AuthUserUpdate,
        id_: IdValue,
        column: str = "id",
    ) -> AuthUserSchema:
        """Patch entity by id and return the updated model"""
        try:
            await self.get_one(session, id_, column)

            q = (
                update(self.sqla_model)
                .where(getattr(self.sqla_model, column) == id_)
                .values(**data.model_dump(exclude_unset=True))
                .returning(self.sqla_model)
            )

            result = await session.execute(q)
            updated_entity = result.unique().scalar_one()
            await session.commit()
            await session.refresh(updated_entity)
            return self.domain_model.model_validate(updated_entity)

        except IntegrityError as e:
            await session.rollback()
            raise IntegrityConflictException(
                f"{self.sqla_model.__tablename__} {column}={id_} conflict with existing data: {e}",
            ) from e
        except Exception as e:
            await session.rollback()
            if not isinstance(e, RepositoryException):
                raise RepositoryException(f"Failed to update {self.sqla_model.__tablename__}: {e}") from e
            raise


class LinkedAccountsRepository(
    crud_factory(LinkedAccounts, LinkedAccountsDomain, LinkedAccountsCreate, LinkedAccountsUpdate)
):
    def to_inner(self, data: LinkedAccountsCreate | LinkedAccountsDomain | LinkedAccountsUpdate) -> dict:
        return data.model_dump(exclude_unset=True)

    def to_repr(self, object: LinkedAccounts) -> LinkedAccountsDomain:
        return self.domain_model.model_validate(object)

    async def get_by_email_platform(self, session: AsyncSession, email: str, platform: Platform):
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


user_repository = UserRepository()
linked_accounts_repository = LinkedAccountsRepository()
