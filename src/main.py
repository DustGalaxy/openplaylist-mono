from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from adapters._fastapi.login_routes import router as login_router
from adapters._fastapi.user_routes import router as user_router
from database import create_db, drop_db, get_async_session  # noqa: F401
from config import settings

from services.twitch_service import auth_twitch_service
from sqlalchemy.ext.asyncio import AsyncSession

from dto.user_dto import UserRead
from adapters._rabbit.event_handlers import broker


@asynccontextmanager
async def lifespan(app: FastAPI):
    print(settings)
    await broker.start()
    yield
    await broker.stop()


app = FastAPI(lifespan=lifespan)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://localhost:3000",
        "http://127.0.0.1:3000",
        "https://127.0.0.1:3000",
        "openplaylist-auth-service-production.up.railway.app",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(login_router)
app.include_router(user_router)
# @app.post("/login")
# async def login(
#     response: Response,
#     user_id: str = Body(),
#     nickname: str = Body(),
#     auth_type: Literal["twitch", "google"] = Body(..., regex="^(twitch|google)$"),
# ):
#     encoded_jwt = jwt.encode(
#         {
#             "sub": user_id,
#             "exp": settings.SESSION_LIVE_TIME + int(datetime.now().timestamp()),
#             "iat": int(datetime.now().timestamp()),
#             "type": auth_type,
#             "nickname": nickname,
#             "iss": settings.JWT_ISSUER,
#         },
#         settings.JWT_SECRET_KEY,
#         algorithm=settings.JWT_ALGORITHM,
#     )
#     response.set_cookie("auth_token", encoded_jwt, httponly=True, secure=True)


@app.post("/logout")
async def logout(
    response: Response,
):
    response.delete_cookie(settings.COOKIE_NAME)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=settings.SELF_HOST,
        port=settings.SELF_PORT,
        log_level=settings.SELF_LOG_LEVEL,
        reload=settings.SELF_RELOAD,
    )
