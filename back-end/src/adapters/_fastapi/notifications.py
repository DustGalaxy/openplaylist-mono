from fastapi import APIRouter, status
from uuid import UUID
from .dependencies import USER_ID, DB_SESSION, NOTIFY_SERVICE
from src.models.notification import (
    NotificationSettings,
    NotificationSettingsPatch,
    ReadNotification,
    SubscriptionCreate,
)

router = APIRouter(prefix="/notifications")


@router.get("/", status_code=status.HTTP_200_OK)
async def feed(service: NOTIFY_SERVICE, user_id: USER_ID, db_session: DB_SESSION) -> list[ReadNotification]:
    return await service.get_feed(db_session, user_id)


@router.get("/unread-count", status_code=status.HTTP_200_OK)
async def unread_count(service: NOTIFY_SERVICE, user_id: USER_ID, db_session: DB_SESSION) -> int:
    return await service.unread_count(db_session, user_id)


@router.post("/{notification_id}/mark-as-read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_as_read(
    service: NOTIFY_SERVICE,
    user_id: USER_ID,
    db_session: DB_SESSION,
    notification_id: UUID,  # Получаем id из JSON вида {"notification_id": "..."}
):
    await service.mark_direct_as_read(db_session, user_id, notification_id)


@router.post("/mark-all-as-read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_as_read_all(service: NOTIFY_SERVICE, user_id: UUID, db_session: DB_SESSION):
    await service.mark_all_as_read(db_session, user_id)


# --- НАСТРОЙКИ (JSONB) ---


@router.get("/settings", status_code=status.HTTP_200_OK)
async def get_settings(service: NOTIFY_SERVICE, user_id: USER_ID, db_session: DB_SESSION) -> NotificationSettings:
    return await service.settings(db_session, user_id)


@router.patch("/settings", status_code=status.HTTP_200_OK)
async def update_settings(
    service: NOTIFY_SERVICE, user_id: USER_ID, db_session: DB_SESSION, patch: NotificationSettingsPatch
) -> NotificationSettings:
    return await service.patch_settings(db_session, user_id, patch)


# --- ПОДПИСКИ (Subscriptions) ---


@router.post("/subscriptions", status_code=status.HTTP_201_CREATED)
async def subscribe(service: NOTIFY_SERVICE, user_id: USER_ID, db_session: DB_SESSION, data: SubscriptionCreate):
    # Принудительно проставляем user_id из зависимостей авторизации для безопасности
    data.user_id = user_id
    return await service.create_subscription(db_session, data)


@router.delete("/subscriptions/{subscription_id}", status_code=status.HTTP_204_NO_CONTENT)
async def unsubscribe(service: NOTIFY_SERVICE, user_id: USER_ID, db_session: DB_SESSION, subscription_id: UUID):
    success = await service.remove_subscription(db_session, user_id, subscription_id)
    if not success:
        from fastapi import HTTPException

        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subscription not found")
