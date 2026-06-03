from uuid import UUID

from sqlalchemy import Enum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from src._types import Platform
from src.database import Base, UUIDMixin, TimestampMixin


class LinkedAccounts(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "linked_accounts"

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), nullable=False)

    platform: Mapped[Platform] = mapped_column(Enum(Platform), nullable=False)
    platform_user_email: Mapped[str] = mapped_column("platform_user_email", nullable=False)
    platform_user_id: Mapped[str] = mapped_column("platform_user_id", nullable=False)
    platform_username: Mapped[str] = mapped_column("platform_username", nullable=False)
    platform_avatar_url: Mapped[str] = mapped_column("platform_avatar_url", nullable=False)

    bot_connection: Mapped[bool] = mapped_column("bot_connection", nullable=False, default=False)
