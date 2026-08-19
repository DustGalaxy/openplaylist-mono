from datetime import datetime
from uuid import UUID

from simple_repository import crud_factory
from simple_repository.exceptions import IntegrityConflictException, RepositoryException
from sqlalchemy import case, func, literal_column, select, union_all, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.notification import (
    DirectNotification,
    DirectNotificationCreate,
    EventNotificationCreate,
    EvetnNotification,
    NotificationSettings,
    NotificationSettingsCreate,
    NotificationSettingsPatch,
    ReadNotification,
    Subscription,
    SubscriptionCreate,
    SubscriptionPatch,
)
from src.orm.notification import DirectNotificationORM, EventNotificationORM, NotificationSettingsORM, SubscriptionORM


class NotificationRepository:
    async def create_direct(
        self,
        session: AsyncSession,
        data: DirectNotificationCreate,
    ) -> DirectNotification:
        """Create a single entity"""
        try:
            db_model = DirectNotificationORM(**data.model_dump())
            session.add(db_model)
            await session.commit()
            await session.refresh(db_model)
            return DirectNotification.model_validate(db_model)

        except IntegrityError as e:
            await session.rollback()
            raise IntegrityConflictException(
                f"{DirectNotificationORM.__tablename__} conflicts with existing data: {e}",
            ) from e

        except Exception as e:
            await session.rollback()
            raise RepositoryException(f"Failed to create {DirectNotificationORM.__tablename__}: {e}") from e

    async def create_event(
        self,
        session: AsyncSession,
        data: EventNotificationCreate,
    ) -> EvetnNotification:
        """Create a single entity"""
        try:
            db_model = EventNotificationORM(**data.model_dump())
            session.add(db_model)
            await session.commit()
            await session.refresh(db_model)
            return EvetnNotification.model_validate(db_model)

        except IntegrityError as e:
            await session.rollback()
            raise IntegrityConflictException(
                f"{EventNotificationORM.__tablename__} conflicts with existing data: {e}",
            ) from e

        except Exception as e:
            await session.rollback()
            raise RepositoryException(f"Failed to create {EventNotificationORM.__tablename__}: {e}") from e

    async def get_full_notification_feed(
        self,
        session: AsyncSession,
        user_id: UUID,
        limit: int = 20,
    ) -> list[ReadNotification]:
        # Запрос 1: Прямые личные уведомления (Фильтруем по muted_event_types)
        direct_notifications = (
            select(
                DirectNotificationORM.id,
                DirectNotificationORM.notification_type.label("type"),
                DirectNotificationORM.notification_data.label("data"),
                DirectNotificationORM.is_read,
                DirectNotificationORM.created_at,
            )
            .join(NotificationSettingsORM, NotificationSettingsORM.user_id == DirectNotificationORM.user_id)
            .where(
                DirectNotificationORM.user_id == user_id,
                # Проверяем, что тип директ-ивента НЕ заглушен пользователем
                ~NotificationSettingsORM.filters["muted_event_types"].has_key(DirectNotificationORM.notification_type).is_(False)
                & NotificationSettingsORM.filters.is_not(None),
            )
        )

        # Запрос 2: Уведомления по подпискам (Фильтруем и по ивентам, и по таргетам)
        subscription_notifications = (
            select(
                EventNotificationORM.id,
                EventNotificationORM.event_type.label("type"),
                EventNotificationORM.event_data.label("data"),
                case(
                    (EventNotificationORM.created_at < NotificationSettingsORM.last_notification_read_ts, True),
                    else_=False,
                ).label("is_read"),
                EventNotificationORM.created_at,
            )
            .join(
                SubscriptionORM,
                (SubscriptionORM.target_id == EventNotificationORM.target_id)
                & (SubscriptionORM.target_type == EventNotificationORM.target_type),
            )
            .join(NotificationSettingsORM, NotificationSettingsORM.user_id == SubscriptionORM.user_id)
            .where(
                SubscriptionORM.user_id == user_id,
                EventNotificationORM.created_at >= SubscriptionORM.created_at,
                # 1. Проверяем черный список ИВЕНТОВ (например, track.added)
                ~NotificationSettingsORM.filters["muted_event_types"].has_key(EventNotificationORM.event_type).is_(False)
                & NotificationSettingsORM.filters.is_not(None),
                # 2. Проверяем черный список ТАРГЕТОВ (например, у юзера глобально выключены уведомления от 'artist')
                ~NotificationSettingsORM.filters["muted_target_types"].has_key(EventNotificationORM.target_type).is_(False)
                & NotificationSettingsORM.filters.is_not(None),
            )
        )

        # Объединение, сортировка по дате создания и пагинация
        final_query = (
            union_all(direct_notifications, subscription_notifications).order_by(literal_column("created_at").desc()).limit(limit)
        )

        result = await session.execute(final_query)
        return [ReadNotification.model_validate(res) for res in result.all()]

    async def get_unread_notification_count(
        self,
        session: AsyncSession,
        user_id: UUID,
    ) -> int:
        # 1. Сначала берем таймстамп последнего прочтения из настроек
        settings_stmt = select(NotificationSettingsORM.last_notification_read_ts).where(
            NotificationSettingsORM.user_id == user_id
        )
        settings_result = await session.execute(settings_stmt)

        last_read_ts = settings_result.scalar_one_or_none() or datetime(1970, 1, 1)
        # 2. Считаем непрочитанные Директ-уведомления (где is_read == False)
        direct_unread = (
            select(DirectNotificationORM.id.label("id"))
            .join(NotificationSettingsORM, NotificationSettingsORM.user_id == DirectNotificationORM.user_id)
            .where(
                DirectNotificationORM.user_id == user_id,
                DirectNotificationORM.is_read == False,
                ~NotificationSettingsORM.filters["muted_event_types"].has_key(DirectNotificationORM.notification_type),
            )
        )

        # 3. Считаем непрочитанные Подписки (всё, что новее last_read_ts)
        subs_unread = (
            select(EventNotificationORM.id.label("id"))
            .join(
                SubscriptionORM,
                (SubscriptionORM.target_id == EventNotificationORM.target_id)
                & (SubscriptionORM.target_type == EventNotificationORM.target_type),
            )
            .join(NotificationSettingsORM, NotificationSettingsORM.user_id == SubscriptionORM.user_id)
            .where(
                SubscriptionORM.user_id == user_id,
                EventNotificationORM.created_at >= SubscriptionORM.created_at,
                # Ключевое условие: событие создано после того, как юзер заглядывал в колокольчик
                EventNotificationORM.created_at > last_read_ts,
                ~NotificationSettingsORM.filters["muted_event_types"].has_key(EventNotificationORM.event_type),
                ~NotificationSettingsORM.filters["muted_target_types"].has_key(EventNotificationORM.target_type),
            )
        )

        # 4. Объединяем ID через UNION ALL и делаем один общий COUNT
        final_query = select(func.count()).select_from(union_all(direct_unread, subs_unread).subquery())

        result = await session.execute(final_query)
        return result.scalar_one_or_none() or 0

    async def mark_direct_as_read(self, session: AsyncSession, user_id: UUID, notification_id: UUID):
        stmt = (
            update(DirectNotificationORM)
            .where(DirectNotificationORM.id == notification_id, DirectNotificationORM.user_id == user_id)
            .values(is_read=True)
        )
        await session.execute(stmt)

    async def mark_all_direct_as_read(self, session: AsyncSession, user_id: UUID):
        stmt = (
            update(DirectNotificationORM)
            .where(DirectNotificationORM.user_id == user_id, DirectNotificationORM.is_read == False)
            .values(is_read=True)
        )
        await session.execute(stmt)


_notification_repo = NotificationRepository()


def get_notification_repo():
    return _notification_repo


class NotificationSettingsRepository(
    crud_factory(NotificationSettingsORM, NotificationSettings, NotificationSettingsCreate, NotificationSettingsPatch)
):
    def to_inner(self, data: NotificationSettingsCreate | NotificationSettings | NotificationSettingsPatch) -> dict:
        if isinstance(data, dict):
            return data
        return data.model_dump(exclude_unset=True)

    def to_repr(self, object: NotificationSettingsORM) -> NotificationSettings:
        return self.domain_model.model_validate(object)

    async def update_read_timestamp(self, session: AsyncSession, user_id: UUID):
        stmt = (
            update(NotificationSettingsORM)
            .where(NotificationSettingsORM.user_id == user_id)
            .values(last_notification_read_ts=func.now())
        )
        await session.execute(stmt)


_notification_settings_repo = NotificationSettingsRepository()


def get_notification_settings_repo():
    return _notification_settings_repo


class SubscriptionsRepository(crud_factory(SubscriptionORM, Subscription, SubscriptionCreate, SubscriptionPatch)):
    def to_inner(self, data: SubscriptionCreate | Subscription | SubscriptionPatch) -> dict:
        if isinstance(data, dict):
            return data
        return data.model_dump(exclude_unset=True)

    def to_repr(self, object: SubscriptionORM) -> Subscription:
        return self.domain_model.model_validate(object)


_subs_settings_repo = SubscriptionsRepository()


def get_subs_settings_repo():
    return _subs_settings_repo
