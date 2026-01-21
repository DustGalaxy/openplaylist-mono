from datetime import datetime
from typing import Annotated

from _types import Platform
from settings import settings
from database import get_async_session
from dto.twitch import CodeDTO
from dto.user import IntegrationRead, IntegrationType, UserRead
from fastapi import APIRouter, Depends, HTTPException, Response
from models.auth_user import AuthUserDomain
from services.auth_service import auth_service
from services.da_service import auth_da_service
from services.twitch_service import auth_twitch_service
from sqlalchemy.ext.asyncio import AsyncSession
from utils import find

router = APIRouter(prefix="/user")


@router.get("/me")
async def me(
    response: Response,
    curr_user: Annotated[AuthUserDomain, Depends(auth_service.get_current_user)],
):
    token = auth_service.encode_jwt(curr_user.id, curr_user.username)
    response.set_cookie(settings.COOKIE_NAME, token, httponly=True, secure=True, max_age=settings.SESSION_LIVE_TIME)
    link = find(curr_user.linked_accounts, lambda x: x.platform == curr_user.main_platform)
    if link is None:
        link = curr_user.linked_accounts[0]
    return {
        "user": UserRead(
            id=curr_user.id,
            username=link.platform_username,
            profile_image_url=link.platform_avatar_url,
            curr_platform=curr_user.main_platform,
        ),
        "expired_at": settings.SESSION_LIVE_TIME + int(datetime.now().timestamp()),
    }


# @router.get("/update_data")
# async def upd_data(
#     db_session: Annotated[AsyncSession, Depends(get_async_session)],
#     curr_user: Annotated[AuthUserDomain, Depends(auth_service.get_current_user)],
# ):
#     await auth_service.refresh_account_tokens(db_session, curr_user)
#     upd_user = await auth_service.upd_data(db_session, curr_user)
#     return UserRead.model_validate(upd_user)


@router.post("/bots/{type}/connect")
async def connect_bot(
    db_session: Annotated[AsyncSession, Depends(get_async_session)],
    curr_user: Annotated[AuthUserDomain, Depends(auth_service.get_current_user)],
    type: Platform,
):
    await auth_service.connect_bot(db_session, curr_user, type)
    return {"message": "Bot connected"}


@router.get("/integration")
async def get_integration(
    curr_user: Annotated[AuthUserDomain, Depends(auth_service.get_current_user)],
):
    integrations = auth_service.intergations(curr_user)
    return [IntegrationRead.model_validate(i) for i in integrations]


@router.post("/integration")
async def integration(
    db_session: Annotated[AsyncSession, Depends(get_async_session)],
    code: CodeDTO,
    type: IntegrationType,
    curr_user: Annotated[AuthUserDomain, Depends(auth_service.get_current_user)],
):
    if type.type == "twitch":
        await auth_twitch_service.add_integration(db_session, curr_user.id, code.code)
    elif type.type == "da":
        await auth_da_service.add_integration(db_session, curr_user.id, code.code)
    else:
        raise HTTPException(status_code=400, detail="Invalid integration type")


@router.delete("/integration", status_code=204)
async def delete_integration(
    db_session: Annotated[AsyncSession, Depends(get_async_session)],
    type: IntegrationType,
    curr_user: Annotated[AuthUserDomain, Depends(auth_service.get_current_user)],
):
    if type.type == "twitch":
        await auth_twitch_service.delete_integration(db_session, curr_user.id)
    elif type.type == "da":
        await auth_da_service.delete_integration(db_session, curr_user.id)
    else:
        raise HTTPException(status_code=400, detail="Invalid integration type")
    return {"message": "Integration deleted"}
