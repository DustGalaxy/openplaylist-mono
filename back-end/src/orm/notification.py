from datetime import datetime
from uuid import UUID

from sqlalchemy import ForeignKey, Index, func, text, Enum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from src._types import NotificationType, PLAYLIST_EVENTS_SET, USER_EVENTS_SET
from src.database import Base, UUIDMixin, TimestampMixin


def get_default_subscription_settings(context) -> dict:
    """Генерирует дефолтный белый список ивентов в зависимости от target_type."""
    # Получаем target_type из текущих параметров вставляемой строки
    target_type = context.get_current_parameters().get("target_type")

    if target_type == "playlist":
        return {"allowed_event_types": list(PLAYLIST_EVENTS_SET)}
    if target_type == "user":
        return {"allowed_event_types": list(USER_EVENTS_SET)}

    return {"allowed_event_types": []}


class DirectNotificationORM(Base, UUIDMixin, TimestampMixin):
    __tablename__: str = "direct_notifications"

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    notification_type: Mapped[str] = mapped_column(nullable=False)
    notification_data: Mapped[dict] = mapped_column(JSONB, nullable=True)
    is_read: Mapped[bool] = mapped_column(nullable=False, default=False, server_default="false")

    __table_args__ = (
        # Идеален для WHERE user_id = X ORDER BY created_at DESC
        Index("idx_notifications_user_created", "user_id", "created_at"),
        # Настоящий ЧАСТИЧНЫЙ индекс. Весит копейки, хранит только то, что НЕ прочитано
        Index("ix_direct_notifications_user_unread", "user_id", postgresql_where=text("is_read = false")),
    )


class EventNotificationORM(Base, UUIDMixin):
    __tablename__: str = "notification_events"

    target_id: Mapped[UUID] = mapped_column(nullable=False)
    target_type: Mapped[str] = mapped_column(nullable=False)
    event_type: Mapped[str] = mapped_column(nullable=False)
    event_data: Mapped[dict] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(nullable=False, server_default=func.now())

    __table_args__ = (
        # Ускоряет выборку событий для конкретного таргета + сортировку по дате
        Index("idx_events_lookup", "target_type", "target_id", "created_at"),
    )


class SubscriptionORM(Base, UUIDMixin):
    __tablename__: str = "subscriptions"

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    target_id: Mapped[UUID] = mapped_column(nullable=False)
    target_type: Mapped[str] = mapped_column(nullable=False)
    target_name: Mapped[str] = mapped_column(nullable=False)
    settings: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False,
        insert_default=get_default_subscription_settings,
        server_default='{"allowed_event_types": []}',
    )
    created_at: Mapped[datetime] = mapped_column(nullable=False, server_default=func.now())

    __table_args__ = (
        # Гарантирует уникальность + ускоряет поиск подписок конкретного юзера
        Index("uq_user_sub", "user_id", "target_type", "target_id", unique=True),
        # Ускоряет JOIN с таблицей notification_events по таргету
        Index("idx_subscriptions_target", "target_type", "target_id"),
    )


class NotificationSettingsORM(Base, UUIDMixin, TimestampMixin):
    __tablename__: str = "notification_settings"

    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    filters: Mapped[dict] = mapped_column(JSONB, nullable=False, server_default="{}")
    last_notification_read_ts: Mapped[datetime] = mapped_column(nullable=False, server_default=func.now())

    __table_args__ = (Index("ix_notification_settings_user", "user_id"),)
