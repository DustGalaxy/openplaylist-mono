from uuid import UUID

from pydantic import BaseModel
from simple_repository import crud_factory

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.stream_token import StreamTokenSchema, StreamTokenCreate, StreamTokenPatch
from src.orm.stream_token import StreamToken


class StreamTokenRepository:
    async def upsert(self, session: AsyncSession, user_id: UUID, token_hash: str):
        try:
            stmt = insert(StreamToken).values(user_id=user_id, token_hash=token_hash)

            upsert_stmt = stmt.on_conflict_do_update(
                index_elements=["user_id"],
                set_={"token_hash": stmt.excluded.token_hash},
            ).returning(StreamToken)
            result = await session.execute(upsert_stmt)
            await session.commit()
            return result.scalar_one()

        except IntegrityError as e:
            await session.rollback()

    async def get_by_hash(self, session: AsyncSession, hash: str):
        res = await session.execute(select(StreamToken).where(StreamToken.token_hash == hash))
        return res.scalar_one_or_none()

    async def get_one(self, session: AsyncSession, user_id: UUID) -> StreamToken | None:
        res = await session.execute(select(StreamToken).where(StreamToken.user_id == user_id))
        return res.scalar_one_or_none()


_stream_token_repository = StreamTokenRepository()


def get_stream_token_repository() -> StreamTokenRepository:
    return _stream_token_repository
