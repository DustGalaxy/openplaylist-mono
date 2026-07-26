from uuid import UUID

from fastapi import APIRouter, HTTPException, status

from src.dto.notifications import ChangeSettingsSubscription, NewSubscription
from src.models.notification import (
    NotificationSettings,
    NotificationSettingsPatch,
    ReadNotification,
    SubscriptionCreate,
    SubscriptionPatch,
)

from .dependencies import DB_SESSION, NOTIFY_SERVICE, USER_ID

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

@router.get("/subscriptions", status_code=status.HTTP_200_OK)
async def fetch_subscribe(service: NOTIFY_SERVICE, user_id: USER_ID, db_session: DB_SESSION):
    return await service.subs_repo.get_many(db_session, user_id, column="user_id")

@router.post("/subscriptions", status_code=status.HTTP_201_CREATED)
async def subscribe(service: NOTIFY_SERVICE, user_id: USER_ID, db_session: DB_SESSION, data: NewSubscription):
    # Принудительно проставляем user_id из зависимостей авторизации для безопасности
    return await service.create_subscription(
        db_session, SubscriptionCreate(user_id=user_id, **data.model_dump(exclude_unset=True))
    )


@router.patch("/subscriptions/{id}", status_code=status.HTTP_200_OK)
async def patch_sub(
    service: NOTIFY_SERVICE, user_id: USER_ID, db_session: DB_SESSION, id: UUID, data: ChangeSettingsSubscription
):
    # Принудительно проставляем user_id из зависимостей авторизации для безопасности
    try:
        return await service.patch_subscription(db_session, user_id, id, SubscriptionPatch(**data.model_dump()))
    except PermissionError:
        raise HTTPException(401)

@router.delete("/subscriptions/{subscription_id}", status_code=status.HTTP_204_NO_CONTENT)
async def unsubscribe(service: NOTIFY_SERVICE, user_id: USER_ID, db_session: DB_SESSION, subscription_id: UUID):
    success = await service.remove_subscription(db_session, user_id, subscription_id)
    if not success:
        from fastapi import HTTPException

        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subscription not found")
