from simple_repository import crud_factory
from simple_repository.exceptions import NotFoundException

from models.user import User, UserCreate, UserPatch

from orm.user import User as ORMUser


class UserRepository(crud_factory(ORMUser, User, UserCreate, UserPatch)):
    async def get_one_or_create(self, session, da_id: str, id: str):
        try:
            return await self.get_one(session, id)
        except NotFoundException:
            return await self.create(session, UserCreate(da_id=da_id, id=id))


user_repo = UserRepository()
