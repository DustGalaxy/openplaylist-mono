from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import UUID, ForeignKey, Index, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src._types import Platform
from src.database import Base, TimestampMixin, UUIDMixin

if TYPE_CHECKING:
    from src.orm.linked_accounts import LinkedAccounts


class UserRole(Base):
    __tablename__ = "user_roles"

    id: Mapped[str] = mapped_column(nullable=False, primary_key=True)
    """Machine slug идентифицирующий источник/тип роли, не для показа юзеру.
    Примеры: 'twitch_sub', 'manual_promo_2026_07', 'admin_grant'."""

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), nullable=False, primary_key=True)

    tier: Mapped[int] = mapped_column(default=0, nullable=False)
    start_date: Mapped[datetime] = mapped_column(nullable=False)
    expires_at: Mapped[datetime | None] = mapped_column(nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    """Ручной отзыв (бан/ошибка выдачи) без потери исходного expires_at для истории/аудита."""

    __table_args__ = (Index("ix_user_roles_user_id", "user_id"),)


class Banlist(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "ban_list"

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    reason: Mapped[str]
    expires_at: Mapped[datetime | None] = mapped_column(nullable=True)


class User(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "users"

    username: Mapped[str]
    bio: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    password: Mapped[str] = mapped_column(nullable=True)
    email: Mapped[str] = mapped_column(unique=True, index=True, nullable=False)
    email_confirmed: Mapped[bool] = mapped_column(default=False, nullable=False)
    avatar_url: Mapped[str] = mapped_column(nullable=True)

    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    is_public: Mapped[bool] = mapped_column(default=True, nullable=False)

    social_links: Mapped[dict[str, str]] = mapped_column(JSONB, nullable=True)
    stats_visibility: Mapped[dict] = mapped_column(JSONB, nullable=True, server_default="{}")
    linked_accounts: Mapped[list["LinkedAccounts"]] = relationship(lazy="joined")
    roles: Mapped[list["UserRole"]] = relationship(lazy="joined")

    last_login: Mapped[datetime] = mapped_column(nullable=False, server_default=func.now())
