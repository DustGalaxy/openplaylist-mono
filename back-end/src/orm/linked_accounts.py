from uuid import UUID
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from src.orm.token_vault import TokenVault

from sqlalchemy import Enum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import JSONB

from src._types import IntegrationPlatform
from src.database import Base, UUIDMixin, TimestampMixin


class LinkedAccounts(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "linked_accounts"

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), nullable=False)

    platform: Mapped[IntegrationPlatform] = mapped_column(Enum(IntegrationPlatform, native_enum=False), nullable=False)
    platform_user_email: Mapped[str | None] = mapped_column("platform_user_email", nullable=True)
    platform_user_id: Mapped[str] = mapped_column("platform_user_id", nullable=False)
    platform_username: Mapped[str] = mapped_column("platform_username", nullable=False)
    platform_avatar_url: Mapped[str] = mapped_column("platform_avatar_url", nullable=False)

    bot_connection: Mapped[bool] = mapped_column("bot_connection", nullable=False, default=False)
    bot_settings: Mapped[dict] = mapped_column(JSONB, nullable=True)

    is_dead: Mapped[bool] = mapped_column(nullable=False, default=False)
    tokens: Mapped["TokenVault"] = relationship(lazy="selectin", back_populates="linked_account")
