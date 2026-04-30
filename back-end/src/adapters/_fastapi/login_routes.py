import json
import uuid

from fastapi import APIRouter, Body, HTTPException, Response

from dto.token import CodeDTO
from adapters._redis.broker import redis_adapter
from models.auth_user import AuthUserCreate
from models.linked_accounts import LinkedAccountsCreate

from settings import settings
from .dependencies import DB_SESSION, auth_service
from exceptions import NeedConfirmationException

router = APIRouter(prefix="/login")


@router.post("/classic", status_code=200)
async def login_classic(
    response: Response,
    db_session: DB_SESSION,
    username: str = Body(),
    password: str = Body(),
): ...


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
        response.status_code = 200
        return None

    except NeedConfirmationException as e:
        link_session_id = str(uuid.uuid4())
        redis_adapter.set(
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
    raw_data: str = str(redis_adapter.getdel(f"link_sessions:{link_session_id}"))

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

        token = auth_service.encode_jwt(user.id, user.username)

        response.set_cookie(settings.COOKIE_NAME, token, httponly=True, secure=True)

        return {"status": "ok"}

    token = await auth_service.confirm_account_merge(db_session, data)
    response.set_cookie(settings.COOKIE_NAME, token, httponly=True, secure=True)

    return {"status": "ok"}
