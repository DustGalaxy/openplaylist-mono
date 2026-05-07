from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from _types import Platform
from database import Base, UUIDMixin, TimestampMixin

if TYPE_CHECKING:
    from orm.linked_accounts import LinkedAccounts


class User(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "users"

    username: Mapped[str]
    password: Mapped[str] = mapped_column(nullable=True)
    email: Mapped[str] = mapped_column(unique=True, index=True, nullable=False)
    email_confirmed: Mapped[bool] = mapped_column(default=False, nullable=False)
    avatar_url: Mapped[str] = mapped_column(nullable=True)

    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    vip_expires_at: Mapped[datetime | None]

    social_links: Mapped[dict[str, str]] = mapped_column(JSONB, nullable=True)
    linked_accounts: Mapped[list["LinkedAccounts"]] = relationship(lazy="joined")

    last_login: Mapped[datetime] = mapped_column(nullable=False, server_default=func.now())
