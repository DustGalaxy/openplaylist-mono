from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy.orm import Mapped, mapped_column, relationship

from _types import Platform
from database import Base, UUIDMixin, TimestampMixin

if TYPE_CHECKING:
    from orm.linked_accounts import LinkedAccounts


class User(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "users"

    last_login: Mapped[datetime]
    username: Mapped[str]
    main_platform: Mapped[Platform]
    vip_before: Mapped[datetime | None]


    linked_accounts: Mapped[list["LinkedAccounts"]] = relationship(lazy="joined")
