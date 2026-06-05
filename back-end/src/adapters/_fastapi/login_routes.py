import json
import uuid

from fastapi import APIRouter, Body, HTTPException, Response

from src.dto.token import CodeDTO
from src.dto.user import HttpClassicLogin, HttpClassicRegister
from src.dal._redis.broker import get_broker
from src.models.auth_user import AuthUserCreate
from src.models.linked_accounts import LinkedAccountsCreate

from src.settings import settings
from src.adapters._fastapi.dependencies import DB_SESSION, auth_service
from src.exceptions import NeedConfirmationException


router = APIRouter(prefix="/login")


@router.post("/classic", status_code=200)
async def login_classic(
    response: Response,
    db_session: DB_SESSION,
    data: HttpClassicLogin,
):
    user_jwt = await auth_service.login_classic(db_session, data.email, data.password)

    response.set_cookie(settings.COOKIE_NAME, user_jwt, httponly=True, secure=True)

    return {"status": "ok"}


@router.post("/register", status_code=202)
async def register_classic(
    db_session: DB_SESSION,
    data: HttpClassicRegister,
):
    await auth_service.register_classic(db_session, data.username, data.email, data.password)

    return {"detail": "need email confirmation"}


@router.post("/email_confirmation", status_code=200)
async def confirm_email(
    response: Response,
    db_session: DB_SESSION,
    session_id: uuid.UUID = Body(),
    email: str = Body(),
):
    user_data = get_broker().getdel(f"email_new_user_data:{email}:{session_id}")
    if user_data != "None" and user_data is not None:
        await auth_service.create_user(db_session, AuthUserCreate.model_validate_json(str(user_data)))

    user_jwt = await auth_service.confirm_email(db_session, email, session_id)

    response.set_cookie(settings.COOKIE_NAME, user_jwt, httponly=True, secure=True)
    return {"status": "ok"}


@router.post("/social/{type}", status_code=200)
async def login_by_social(
    response: Response,
    db_session: DB_SESSION,
    code: CodeDTO,
    type: str,
) -> dict | None:
    try:
        token = await auth_service.login_by_social(db_session, code.code, type)
        response.set_cookie(settings.COOKIE_NAME, token, httponly=True, secure=True)
        return None

    except NeedConfirmationException as e:
        link_session_id = str(uuid.uuid4())
        get_broker().set(
            f"link_sessions:{link_session_id}",
            json.dumps(e.data),
            ex=600,
        )

        response.status_code = 202
        return {
            "action": "NEED_CONFIRMATION",
            "link_session_id": link_session_id,
            "display_info": {"username": e.data["platform_username"], "platform": e.data["platform"]},
        }


@router.post("/resolve_email_colision", status_code=200)
async def confirm_account_merge(
    response: Response,
    db_session: DB_SESSION,
    link_session_id: str = Body(),
    is_confirmed: bool = Body(),
):
    raw_data: str = str(get_broker().getdel(f"link_sessions:{link_session_id}"))

    if not raw_data:
        raise HTTPException(status_code=400, detail="Link session expired")

    data: dict = json.loads(raw_data)
    if not is_confirmed:
        new_user = AuthUserCreate(
            username=data["username"],
            email=data["email"],
            avatar_url=data["avatar_url"],
        )
        user = await auth_service.create_user(db_session, new_user)
        data["user_id"] = user.id
        new_link = LinkedAccountsCreate.model_validate(data)
        await auth_service.create_link(db_session, new_link)

        user_jwt = auth_service.encode_jwt(user.id, user.username)

        response.set_cookie(settings.COOKIE_NAME, user_jwt, httponly=True, secure=True)

        return {"status": "ok"}

    token = await auth_service.confirm_account_merge(db_session, data)
    response.set_cookie(settings.COOKIE_NAME, token, httponly=True, secure=True)

    return {"status": "ok"}
