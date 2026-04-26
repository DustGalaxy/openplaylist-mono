from fastapi import APIRouter, HTTPException, Response


from services.twitch_service import auth_twitch_service
from services.da_service import auth_da_service

from dto.twitch import CodeDTO

from settings import settings
from .dependencies import DB_SESSION

router = APIRouter(prefix="/login")



async def login_classic(
    response: Response,
    db_session: DB_SESSION,
    username: str,
    password: str,
):
    token = await auth_service.login(db_session, username, password)
    response.set_cookie(settings.COOKIE_NAME, token, httponly=True, secure=True)

async def login_by_social(
    response: Response,
    db_session: DB_SESSION,
    code: CodeDTO,
    type: str,
):
    if type == "twitch":
        await twitch_login(response, db_session, code)
    elif type == "da":
        await da_login(response, db_session, code)
    else:
        raise HTTPException(status_code=400, detail="Invalid integration type")

    return {"message": "Login successful"}


@router.post("/twitch")
async def twitch_login(
    response: Response,
    db_session: DB_SESSION,
    code: CodeDTO,
):
    token = await auth_twitch_service.login(db_session, code.code)
    response.set_cookie(settings.COOKIE_NAME, token, httponly=True, secure=True)


@router.post("/da")
async def da_login(
    response: Response,
    db_session: DB_SESSION,
    code: CodeDTO,
):
    token = await auth_da_service.login(db_session, code.code)
    response.set_cookie(settings.COOKIE_NAME, token, httponly=True, secure=True)
