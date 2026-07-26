from uuid import UUID

from fastapi import APIRouter, Body, HTTPException

from src.adapters._fastapi.dependencies import DB_SESSION, PLST_ID, RULES_SERVICE
from src.exceptions import NotAuthorizedException
from src.models.playlist import (
    BlockListCreate,
    BlockListPatch,
    ChatRulesCreate,
    ChatRulesPatch,
    ContentSettingsCreate,
    ContentSettingsPatch,
    ContentSettingsSchema,
    DonationRulesCreate,
    DonationRulesPatch,
)

router = APIRouter(prefix="/settings")


# --- PATCH ENDPOINTS ---


@router.patch("/{playlist_id}/content/{item_id}")
async def patch_content_settings(
    db_session: DB_SESSION,
    service: RULES_SERVICE,
    patch_schema: ContentSettingsPatch,
    item_id: UUID,
    playlist_id: PLST_ID,
) -> ContentSettingsSchema:
    if not playlist_id:
        raise NotAuthorizedException()

    sub_item = await service.patch_sub_item(db_session, patch_schema, item_id, playlist_id)
    return sub_item


@router.patch("/{playlist_id}/donation/{item_id}")
async def patch_donation_rules(
    db_session: DB_SESSION,
    service: RULES_SERVICE,
    patch_schema: DonationRulesPatch,
    item_id: UUID,
    playlist_id: PLST_ID,
):
    if not playlist_id:
        raise NotAuthorizedException()

    sub_item = await service.patch_sub_item(db_session, patch_schema, item_id, playlist_id)
    return sub_item


@router.patch("/{playlist_id}/chat/order")
async def reorder_chat_rules(
    db_session: DB_SESSION,
    service: RULES_SERVICE,
    playlist_id: PLST_ID,
    item_list: list[UUID] = Body(...),
):
    if not playlist_id:
        raise NotAuthorizedException()
    try:
        await service.reorder_chat_rules(db_session, item_list, playlist_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/{playlist_id}/chat/{item_id}")
async def patch_chat_rules(
    db_session: DB_SESSION, patch_schema: ChatRulesPatch, item_id: UUID, service: RULES_SERVICE, playlist_id: PLST_ID
):
    if not playlist_id:
        raise NotAuthorizedException()

    sub_item = await service.patch_sub_item(db_session, patch_schema, item_id, playlist_id)
    return sub_item


@router.patch("/{playlist_id}/blocklist/{item_id}")
async def patch_blocklist_settings(
    db_session: DB_SESSION, patch_schema: BlockListPatch, item_id: UUID, service: RULES_SERVICE, playlist_id: PLST_ID
):
    if not playlist_id:
        raise NotAuthorizedException()

    sub_item = await service.patch_sub_item(db_session, patch_schema, item_id, playlist_id)
    return sub_item


# --- CREATE ENDPOINTS ---


@router.post("/{playlist_id}/content", status_code=201)
async def create_content_settings(
    db_session: DB_SESSION, data: ContentSettingsCreate, service: RULES_SERVICE, playlist_id: PLST_ID
):
    if not playlist_id:
        raise NotAuthorizedException()

    sub_item = await service.create_sub_item(db_session, data)
    return sub_item


@router.post("/{playlist_id}/donation", status_code=201)
async def create_donation_rules(
    db_session: DB_SESSION, data: DonationRulesCreate, service: RULES_SERVICE, playlist_id: PLST_ID
):
    if not playlist_id:
        raise NotAuthorizedException()
    sub_item = await service.create_sub_item(db_session, data)
    return sub_item


@router.post("/{playlist_id}/chat", status_code=201)
async def create_chat_rules(
    db_session: DB_SESSION, data: ChatRulesCreate, service: RULES_SERVICE, playlist_id: PLST_ID
):
    if not playlist_id:
        raise NotAuthorizedException()

    sub_item = await service.create_sub_item(db_session, data)
    return sub_item


@router.post("/{playlist_id}/blocklist")
async def create_blocklist_settings(
    db_session: DB_SESSION, data: BlockListCreate, service: RULES_SERVICE, playlist_id: PLST_ID
):
    if not playlist_id:
        raise NotAuthorizedException()

    sub_item = await service.create_sub_item(db_session, data)
    return sub_item


# --- DELETE ENDPOINTS ---


@router.delete("/{playlist_id}/content/{item_id}", status_code=204)
async def delete_content_settings(db_session: DB_SESSION, item_id: UUID, service: RULES_SERVICE, playlist_id: PLST_ID):
    if not playlist_id:
        raise NotAuthorizedException()
    sub_item = await service.delete_sub_item(db_session, item_id, playlist_id, "content")
    return sub_item


@router.delete("/{playlist_id}/donation/{item_id}", status_code=204)
async def delete_donation_rules(db_session: DB_SESSION, item_id: UUID, service: RULES_SERVICE, playlist_id: PLST_ID):
    if not playlist_id:
        raise NotAuthorizedException()
    sub_item = await service.delete_sub_item(db_session, item_id, playlist_id, "donation")
    return sub_item


@router.delete("/{playlist_id}/chat/{item_id}", status_code=204)
async def delete_chat_rules(db_session: DB_SESSION, item_id: UUID, service: RULES_SERVICE, playlist_id: PLST_ID):
    if not playlist_id:
        raise NotAuthorizedException()
    sub_item = await service.delete_sub_item(db_session, item_id, playlist_id, "chat")
    return sub_item


@router.delete("/{playlist_id}/blocklist/{item_id}", status_code=204)
async def delete_blocklist_settings(
    db_session: DB_SESSION, item_id: UUID, service: RULES_SERVICE, playlist_id: PLST_ID
):
    if not playlist_id:
        raise NotAuthorizedException()
    sub_item = await service.delete_sub_item(db_session, item_id, playlist_id, "blocklist")
    return sub_item
