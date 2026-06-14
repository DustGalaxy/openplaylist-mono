from datetime import datetime

from fastapi import APIRouter, HTTPException, Response

from src.dto.token import OAuthBody, UserKeyBody
from src.dto.bots import BotConnectBody, UpdateBotSettingsBody
from src.dto.user import IntegrationRead, UserPatch, UserRead

from src.services.auth.auth_service import auth_service
from src.models.auth_user import AuthUserUpdate
from src.adapters._fastapi.dependencies import DB_SESSION, CURR_USER
from src._types import AuthFlow, IntegrationPlatform
from src.settings import settings
from src.services.auth.strategy_manager import manager

from src.utils import find

router = APIRouter(prefix="/user")


@router.get("/me")
async def me(
    response: Response,
    curr_user: CURR_USER,
):
    token = auth_service.encode_jwt(curr_user.id, curr_user.username)
    response.set_cookie(settings.COOKIE_NAME, token, httponly=True, secure=True, max_age=settings.SESSION_LIVE_TIME)
    return {
        "user": UserRead(
            id=curr_user.id,
            username=curr_user.username,
            email=curr_user.email,
            email_confirmed=curr_user.email_confirmed,
            avatar_url=curr_user.avatar_url or "",
            social_links=curr_user.social_links,
        ),
        "expired_at": settings.SESSION_LIVE_TIME + int(datetime.now().timestamp()),
    }


@router.patch("/me")
async def patch_me(
    db_session: DB_SESSION,
    curr_user: CURR_USER,
    data: UserPatch,
):
    patch = AuthUserUpdate.model_validate(data.model_dump(exclude_unset=True))
    upd_user = await auth_service.user_repo.patch(db_session, patch, curr_user.id)
    return UserRead.model_validate(upd_user)


# @router.get("/update_data")
# async def upd_data(
#     db_session: Annotated[AsyncSession, Depends(get_async_session)],
#     curr_user: Annotated[AuthUserDomain, Depends(auth_service.get_current_user)],
# ):
#     await auth_service.refresh_account_tokens(db_session, curr_user)
#     upd_user = await auth_service.upd_data(db_session, curr_user)
#     return UserRead.model_validate(upd_user)


@router.post("/bots/{platform}/connect")
async def connect_bot(
    db_session: DB_SESSION,
    curr_user: CURR_USER,
    platform: IntegrationPlatform,
    body: BotConnectBody,
):
    await auth_service.connect_bot(db_session, curr_user, platform, body.platform_user_id)
    return {"message": "Bot connected"}


@router.patch("/bots/{platform}/settings")
async def update_bot_settings(
    db_session: DB_SESSION,
    curr_user: CURR_USER,
    platform: IntegrationPlatform,
    body: UpdateBotSettingsBody,
):
    result = await auth_service.update_bot_settings(
        db_session,
        user=curr_user,
        platform=platform,
        platform_user_id=body.platform_user_id,
        settings=body.settings,
    )
    return result


@router.post("/bots/{platform}/disconnect", status_code=204)
async def diconnect_bot(
    db_session: DB_SESSION,
    curr_user: CURR_USER,
    platform: IntegrationPlatform,
    body: BotConnectBody,
):
    result = await auth_service.disconnect_bot(db_session, curr_user, platform, body.platform_user_id)
    return result


@router.get("/integration")
async def get_integration(
    curr_user: CURR_USER,
):
    return [IntegrationRead.model_validate(i) for i in auth_service.intergations(curr_user)]


@router.post("/integration/{platform}")
async def add_integration_oauth(
    db_session: DB_SESSION,
    curr_user: CURR_USER,
    platform: IntegrationPlatform,
    body: OAuthBody,
):
    strtg = manager.get(platform)
    if strtg.meta.auth_flow == AuthFlow.USER_KEY:
        raise HTTPException(400, f"{platform} uses personal token flow, use /integration/{platform}/token")

    await auth_service.add_integration(
        db_session,
        user_id=curr_user.id,
        platform=platform,
        code=body.code,
        code_verifier=body.code_verifier,
    )
    return {"message": "Integration added"}


@router.post("/integration/{platform}/token")
async def add_integration_user_key(
    db_session: DB_SESSION,
    curr_user: CURR_USER,
    platform: IntegrationPlatform,
    body: UserKeyBody,
):
    strtg = manager.get(platform)
    if strtg.meta.auth_flow != AuthFlow.USER_KEY:
        raise HTTPException(400, f"{platform} uses OAuth flow, use /integration/{platform}")

    await auth_service.add_integration(
        db_session,
        user_id=curr_user.id,
        platform=platform,
        user_key=body.user_key,
    )
    return {"message": "Integration added"}


@router.delete("/integration/{platform}/{platform_user_id}", status_code=204)
async def delete_integration(
    db_session: DB_SESSION,
    curr_user: CURR_USER,
    platform: IntegrationPlatform,
    platform_user_id: str,
):
    await auth_service.delete_integration(db_session, curr_user.id, platform, platform_user_id)


@router.delete("/me", status_code=204)
async def delete_me(
    db_session: DB_SESSION,
    curr_user: CURR_USER,
):
    await auth_service.delete_user(db_session, curr_user.id)
    return {"message": "User deleted"}
