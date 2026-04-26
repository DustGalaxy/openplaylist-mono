from simple_repository import crud_factory
from simple_repository.exceptions import NotFoundException

from models.user import User, UserCreate, UserPatch

from orm.user import User as ORMUser


class UserRepository(crud_factory(ORMUser, User, UserCreate, UserPatch)):
    def to_inner(self, data: UserCreate | User | UserPatch) -> dict:

        return data.model_dump(exclude_unset=True)

    def to_repr(self, object: ORMUser) -> User:
        return self.domain_model.model_validate(object)

    async def get_one_or_create(self, session, da_id: str, id: str):
        try:
            return await self.get_one(session, id)
        except NotFoundException:
            return await self.create(session, UserCreate(da_id=da_id, id=id))


user_repo = UserRepository()
