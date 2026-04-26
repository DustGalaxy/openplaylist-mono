from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy.orm import Mapped, mapped_column, relationship

from _types import Platform
from database import Base, UUIDMixin, TimestampMixin

if TYPE_CHECKING:
    from orm.linked_accounts import LinkedAccounts


class User(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "users"

    username: Mapped[str]
    avatar_url: Mapped[str] = mapped_column(nullable=True)

    email: Mapped[str] = mapped_column(unique=True, index=True, nullable=False)

    is_active: Mapped[bool]
    vip_expires_at: Mapped[datetime | None]

    linked_accounts: Mapped[list["LinkedAccounts"]] = relationship(lazy="joined")

    last_login: Mapped[datetime]
