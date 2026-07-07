import json
from typing import AsyncGenerator, Type, Any
from uuid import UUID as UUIDTYPE
from datetime import datetime

from pydantic import BaseModel
from uuid6 import uuid7
from sqlalchemy import DateTime, func, TypeDecorator, Dialect
from sqlalchemy.orm import Mapped, mapped_column, DeclarativeBase
from sqlalchemy.dialects.postgresql import UUID as UUIDCOLUMN, JSONB
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    AsyncSession,
    async_sessionmaker,
    AsyncEngine,
)

from src.settings import settings


class PydanticJSONB(TypeDecorator):
    impl = JSONB
    cache_ok = True

    def __init__(self, pydantic_model: Type[BaseModel]):
        super().__init__()
        self.pydantic_model = pydantic_model

    def process_bind_param(self, value: Any, dialect: Dialect) -> Any:
        # При записи: если это Pydantic, отдаем словарь/строку (у вас сработает serializer из engine)
        if isinstance(value, BaseModel):
            return value.model_dump()
        return value

    def process_result_value(self, value: Any, dialect: Dialect) -> Any:
        # При чтении: база вернула dict (или str), мы парсим его в Pydantic
        if value is None:
            return None
        if isinstance(value, str):
            value = json.loads(value)
        return self.pydantic_model.model_validate(value)


def custom_serializer(obj):
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
