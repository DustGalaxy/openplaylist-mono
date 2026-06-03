from datetime import datetime
from typing import Any

from fastapi import APIRouter, Body, Response

from src.dto.token import CodeDTO
from src.dto.user import IntegrationRead, UserRead

from src.services.auth.auth_service import auth_service
from src.models.auth_user import AuthUserUpdate
from src.adapters._fastapi.dependencies import DB_SESSION, CURR_USER
from src._types import Platform
from src.settings import settings

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
    data: AuthUserUpdate,
):
    upd_user = await auth_service.user_repo.patch(db_session, data, curr_user.id)
    return UserRead.model_validate(upd_user)


# @router.get("/update_data")
# async def upd_data(
#     db_session: Annotated[AsyncSession, Depends(get_async_session)],
#     curr_user: Annotated[AuthUserDomain, Depends(auth_service.get_current_user)],
# ):
#     await auth_service.refresh_account_tokens(db_session, curr_user)
#     upd_user = await auth_service.upd_data(db_session, curr_user)
#     return UserRead.model_validate(upd_user)


@router.post("/bots/{type_}/connect")
async def connect_bot(
    db_session: DB_SESSION,
    curr_user: CURR_USER,
    type_: Platform,
    body: dict = Body(),
):
    await auth_service.connect_bot(db_session, curr_user, type_, body.get("platform_user_id", ""))
    return {"message": "Bot connected"}


@router.get("/integration")
async def get_integration(
    curr_user: CURR_USER,
):
    integrations = auth_service.intergations(curr_user)
    return [IntegrationRead.model_validate(i) for i in integrations]


@router.post("/integration/{type}")
async def integration(
    db_session: DB_SESSION,
    code: CodeDTO,
    type: Platform,
    curr_user: CURR_USER,
):

    await auth_service.add_integration(db_session, curr_user.id, code.code, type)
    return {"message": "Integration added"}


@router.delete("/integration/{type}/{platform_user_id}", status_code=204)
async def delete_integration(
    db_session: DB_SESSION,
    type: Platform,
    platform_user_id: str,
    curr_user: CURR_USER,
):

    await auth_service.delete_integration(db_session, curr_user.id, type, platform_user_id)
    return {"message": "Integration deleted"}

@router.delete("/me", status_code=204)
async def delete_me(
    db_session: DB_SESSION,
    curr_user: CURR_USER,
):
    await auth_service.delete_user(db_session, curr_user.id)
    return {"message": "User deleted"}