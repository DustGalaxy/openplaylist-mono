from uuid import UUID

from fastapi import APIRouter, HTTPException
from fastapi import Body

from .dependencies import CURR_USER, DB_SESSION, STREAM_SERVICE

router = APIRouter(prefix="/stream")


@router.get("/gen-token")
async def gen_token(db_session: DB_SESSION, user: CURR_USER, service: STREAM_SERVICE):
    pub_token = service.generate_new_token(user.id)

    await service.save(db_session, user.id, pub_token)

    return pub_token

