from uuid import UUID

from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from _types import Platform
from database import Base, UUIDMixin, TimestampMixin


class LinkedAccounts(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "linked_accounts"

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), nullable=False)

    platform: Mapped[Platform] = mapped_column("platform", nullable=False)
    platfrom_user_email: Mapped[str] = mapped_column("platform_email", nullable=False)
    platform_user_id: Mapped[str] = mapped_column("platform_user_id", nullable=False)
    platform_username: Mapped[str] = mapped_column("platform_username", nullable=False)
    platform_avatar_url: Mapped[str] = mapped_column("platform_avatar_url", nullable=False)

    bot_connection: Mapped[bool] = mapped_column("bot_connection", nullable=False, default=False)

    access_token: Mapped[str] = mapped_column("access_token", nullable=False)
    refresh_token: Mapped[str] = mapped_column("refresh_token", nullable=False)
    expires_at: Mapped[int] = mapped_column("expires_at", nullable=False)
