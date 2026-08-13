from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, HTTPException, Response

from src.services.permitions.permition_service import check_feature, get_effective_tier, FEATURE_FLAGS
from src._types import AuthFlow, IntegrationPlatform
from src.adapters._fastapi.dependencies import CURR_USER, DB_SESSION, MODERATOR_SERVICE
from src.dto.bots import BotConnectBody, UpdateBotSettingsBody
from src.dto.moderator import UserModeratedPlaylistResponse
from src.dto.token import OAuthBody, UserKeyBody
from src.dto.user import IntegrationRead, PublicUserRead, UserPatch, UserRead

from src.models.auth_user import AuthUserUpdate
from src.services.auth.auth_service import auth_service
from src.services.auth.strategy_manager import manager
from src.settings import settings
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
            bio=curr_user.bio,
            email=curr_user.email,
            email_confirmed=curr_user.email_confirmed,
            avatar_url=curr_user.avatar_url or "",
            social_links=curr_user.social_links,
            is_public=curr_user.is_public,
            roles=curr_user.roles,
        ),
        "expired_at": settings.SESSION_LIVE_TIME + int(datetime.now().timestamp()),  # noqa: DTZ005
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


@router.get("/me/moderating")
async def get_my_moderated_playlists(
    db_session: DB_SESSION,
    curr_user: CURR_USER,
    mod_service: MODERATOR_SERVICE,
) -> list[UserModeratedPlaylistResponse]:
    return await mod_service.get_user_moderated_playlists(db_session, curr_user.id)



# @router.patch("/me/appearance")
# async def update_user_appearance(curr_user: CURR_USER, data: UserAppearancePatch):
#     check_feature(curr_user, "profile_background_upload")


@router.get("/me/features")
async def me_features(
    curr_user: CURR_USER,
):
    tier = get_effective_tier(curr_user.roles)
    return {
        "tier": tier,
        "features": [
            {"key": flag.key, "min_tier": flag.min_tier, "unlocked": flag.is_enabled and flag.min_tier <= tier}
            for flag in FEATURE_FLAGS.values()
        ],
    }


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


@router.get("/{user_id}")
async def user(db_session: DB_SESSION, user_id: UUID):
    public_user = await auth_service.get_public_user(db_session, user_id)
    return PublicUserRead.model_validate(public_user)
