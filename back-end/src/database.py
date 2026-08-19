import json
from collections.abc import AsyncGenerator
from datetime import datetime
from uuid import UUID as UUIDTYPE

from pydantic import BaseModel
from sqlalchemy import DateTime, func
from sqlalchemy.dialects.postgresql import UUID as UUIDCOLUMN
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from uuid6 import uuid7

from src.settings import settings


def custom_serializer(obj: object):
    if isinstance(obj, BaseModel):
        return obj.model_dump_json()
    return json.dumps(obj)


engine: AsyncEngine = create_async_engine(settings.DB_URL, json_serializer=custom_serializer, json_deserializer=json.loads)
async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        yield session


class Base(DeclarativeBase):
    pass


async def create_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def drop_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


class UUIDMixin:
    id: Mapped[UUIDTYPE] = mapped_column(
        "id",
        UUIDCOLUMN(as_uuid=True),
        primary_key=True,
        default=uuid7,
        unique=True,
        index=True,
        nullable=False,
    )


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=func.now(),
        sort_order=9999,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=True,
        index=True,
        server_default=func.now(),
        server_onupdate=func.now(),
        sort_order=10000,
    )
