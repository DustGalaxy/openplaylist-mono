from typing import Annotated
from fastapi import APIRouter, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession

from services.twitch_service import auth_twitch_service
from services.da_service import auth_da_service
from database import get_async_session
from dto.twitch import CodeDTO
from config import settings

router = APIRouter(prefix="/login")


@router.post("/twitch")
async def twitch_login(
    response: Response,
    db_session: Annotated[AsyncSession, Depends(get_async_session)],
    code: CodeDTO,
):
    token = await auth_twitch_service.login(db_session, code.code)
    response.set_cookie(settings.COOKIE_NAME, token, httponly=True, secure=True)


@router.post("/da")
async def da_login(
    response: Response,
    db_session: Annotated[AsyncSession, Depends(get_async_session)],
    code: CodeDTO,
):
    token = await auth_da_service.login(db_session, code.code)
    response.set_cookie(settings.COOKIE_NAME, token, httponly=True, secure=True)
