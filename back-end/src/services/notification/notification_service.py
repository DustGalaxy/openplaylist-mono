from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.models.notification import (
    DirectNotificationCreate,
    EventNotificationCreate,
    SubscriptionCreate,
    NotificationSettingsPatch,
)

from src.dal.postgres.notification import (
    get_notification_repo,
    NotificationRepository,
    NotificationSettingsRepository,
    get_notification_settings_repo,
)


class NotificationService:
    def __init__(self) -> None:
        self.repo: NotificationRepository = get_notification_repo()
        self.settings_repo: NotificationSettingsRepository = get_notification_settings_repo()

    async def create_direct_notification(self, session: AsyncSession, data: DirectNotificationCreate):
        return await self.repo.create_direct(session, data)

    async def create_event_notification(self, session: AsyncSession, data: EventNotificationCreate):
        return await self.repo.create_event(session, data)

    async def create_subscription(self, session: AsyncSession, data: SubscriptionCreate):
        return await self.repo.create_subscription(session, data)

    async def remove_subscription(self, session: AsyncSession, user_id: UUID, id: UUID) -> bool:
        return await self.repo.remove_subscription(session, user_id, id)

    async def get_feed(self, session: AsyncSession, user_id: UUID):
        return await self.repo.get_full_notification_feed(session, user_id)

    async def unread_count(self, session: AsyncSession, user_id: UUID):
        return await self.repo.get_unread_notification_count(session, user_id)

    async def patch_settings(self, session: AsyncSession, user_id: UUID, patch: NotificationSettingsPatch):
        return await self.settings_repo.patch(session, patch, user_id, column="user_id")

    async def settings(self, session: AsyncSession, user_id: UUID):
        return await self.settings_repo.get_one(session, user_id, column="user_id")

    async def mark_direct_as_read(self, session: AsyncSession, user_id: UUID, notification_id: UUID) -> None:
        """Отмечает конкретное Директ-уведомление как прочитанное."""
        # Вызываем метод обновления в репозитории уведомлений
        await self.repo.mark_direct_as_read(session, user_id, notification_id)
        await session.commit()

    async def mark_all_as_read(self, session: AsyncSession, user_id: UUID) -> None:
        """Сбрасывает все уведомления: обновляет таймстамп для подписок и тушит оставшийся директ."""
        # 1. Обновляем last_notification_read_ts в репозитории настроек
        await self.settings_repo.update_read_timestamp(session, user_id)

        # 2. Переводим все директ-уведомления этого юзера в is_read = True
        await self.repo.mark_all_direct_as_read(session, user_id)

        await session.commit()


_notification_service = NotificationService()


def get_notification_service():
    return _notification_service
