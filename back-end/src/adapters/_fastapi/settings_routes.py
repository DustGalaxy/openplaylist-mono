from uuid import UUID

from fastapi import APIRouter, HTTPException
from fastapi import Body

from src.models.settings import (
    SettingsPatch,
    ContentSettingsCreate,
    ContentSettingsPatch,
    BlockListCreate,
    BlockListPatch,
    DonationRulesCreate,
    DonationRulesPatch,
    ChatRulesCreate,
    ChatRulesPatch,
)

from src.adapters._fastapi.dependencies import SETTINGS, DB_SESSION, SETTINGS_SERVICE
from src.exceptions import NotAuthorizedException


router = APIRouter(prefix="/settings")


# --- GET ENDPOINTS ---


@router.get("/{playlist_id}")
async def get_playlist_settings(
    settings: SETTINGS,
):
    return settings


# --- PATCH ENDPOINTS ---


@router.patch("/{playlist_id}")
async def patch_playlist_settings(
    db_session: DB_SESSION,
    service: SETTINGS_SERVICE,
    patch_schema: SettingsPatch,
    settings: SETTINGS,
):

    new_settings = await service.patch(db_session, patch_schema, settings.id)

    return new_settings


@router.patch("/{playlist_id}/content/{item_id}")
async def patch_content_settings(
    db_session: DB_SESSION,
    service: SETTINGS_SERVICE,
    patch_schema: ContentSettingsPatch,
    item_id: UUID,
    settings: SETTINGS,
):
    sub_item = await service.patch_sub_item(db_session, patch_schema, item_id, settings.id)
    return sub_item


@router.patch("/{playlist_id}/donation/{item_id}")
async def patch_donation_rules(
    db_session: DB_SESSION,
    service: SETTINGS_SERVICE,
    patch_schema: DonationRulesPatch,
    item_id: UUID,
    settings: SETTINGS,
):
    sub_item = await service.patch_sub_item(db_session, patch_schema, item_id, settings.id)
    return sub_item


@router.patch("/{playlist_id}/chat/order")
async def reorder_chat_rules(
    db_session: DB_SESSION,
    service: SETTINGS_SERVICE,
    settings: SETTINGS,
    item_list: list[UUID] = Body(...),
):
    try:
        await service.reorder_chat_rules(db_session, item_list, settings.id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/{playlist_id}/chat/{item_id}")
async def patch_chat_rules(
    db_session: DB_SESSION,
    service: SETTINGS_SERVICE,
    patch_schema: ChatRulesPatch,
    item_id: UUID,
    settings: SETTINGS,
):
    sub_item = await service.patch_sub_item(db_session, patch_schema, item_id, settings.id)
    return sub_item


@router.patch("/{playlist_id}/blocklist/{item_id}")
async def patch_blocklist_settings(
    db_session: DB_SESSION,
    service: SETTINGS_SERVICE,
    patch_schema: BlockListPatch,
    item_id: UUID,
    settings: SETTINGS,
):
    sub_item = await service.patch_sub_item(db_session, patch_schema, item_id, settings.id)
    return sub_item


# --- CREATE ENDPOINTS ---


@router.post("/{playlist_id}/content", status_code=201)
async def create_content_settings(
    db_session: DB_SESSION,
    service: SETTINGS_SERVICE,
    data: ContentSettingsCreate,
    settings: SETTINGS,
):
    if data.settings_id != settings.id:
        raise NotAuthorizedException()

    sub_item = await service.create_sub_item(db_session, data)
    return sub_item


@router.post("/{playlist_id}/donation", status_code=201)
async def create_donation_rules(
    db_session: DB_SESSION,
    service: SETTINGS_SERVICE,
    data: DonationRulesCreate,
    settings: SETTINGS,
):
    if data.settings_id != settings.id:
        raise NotAuthorizedException()

    sub_item = await service.create_sub_item(db_session, data)
    return sub_item


@router.post("/{playlist_id}/chat", status_code=201)
async def create_chat_rules(
    db_session: DB_SESSION,
    service: SETTINGS_SERVICE,
    data: ChatRulesCreate,
    settings: SETTINGS,
):
    if data.settings_id != settings.id:
        raise NotAuthorizedException()

    sub_item = await service.create_sub_item(db_session, data)
    return sub_item


@router.post("/{playlist_id}/blocklist")
async def create_blocklist_settings(
    db_session: DB_SESSION,
    service: SETTINGS_SERVICE,
    data: BlockListCreate,
    settings: SETTINGS,
):
    if data.settings_id != settings.id:
        raise NotAuthorizedException()

    sub_item = await service.create_sub_item(db_session, data)
    return sub_item


# --- DELETE ENDPOINTS ---


@router.delete("/{playlist_id}/content/{item_id}", status_code=204)
async def delete_content_settings(
    db_session: DB_SESSION,
    service: SETTINGS_SERVICE,
    item_id: UUID,
    settings: SETTINGS,
):

    sub_item = await service.delete_sub_item(db_session, item_id, settings.id, "content")
    return sub_item


@router.delete("/{playlist_id}/donation/{item_id}", status_code=204)
async def delete_donation_rules(
    db_session: DB_SESSION,
    service: SETTINGS_SERVICE,
    item_id: UUID,
    settings: SETTINGS,
):
    sub_item = await service.delete_sub_item(db_session, item_id, settings.id, "donation")
    return sub_item


@router.delete("/{playlist_id}/chat/{item_id}", status_code=204)
async def delete_chat_rules(
    db_session: DB_SESSION,
    service: SETTINGS_SERVICE,
    item_id: UUID,
    settings: SETTINGS,
):
    sub_item = await service.delete_sub_item(db_session, item_id, settings.id, "chat")
    return sub_item


@router.delete("/{playlist_id}/blocklist/{item_id}", status_code=204)
async def delete_blocklist_settings(
    db_session: DB_SESSION,
    service: SETTINGS_SERVICE,
    item_id: UUID,
    settings: SETTINGS,
):
    sub_item = await service.delete_sub_item(db_session, item_id, settings.id, "blocklist")
    return sub_item
