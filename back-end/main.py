from contextlib import asynccontextmanager

import socketio
import src.models  # noqa: F401
from fastapi import APIRouter, FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from src.adapters._fastapi.feedback_routes import router as feedback_router
from src.adapters._fastapi.history_routes import router as history_router
from src.adapters._fastapi.login_routes import router as login_router
from src.adapters._fastapi.moderator_routes import channel_router as channel_moderator_router, playlist_mod_router
from src.adapters._fastapi.notifications import router as notificattions_router

from src.adapters._fastapi.order_routes import router as order_router
from src.adapters._fastapi.playback_routes import router as playback_router
from src.adapters._fastapi.player_routes import router as player_router
from src.adapters._fastapi.playlist_routes import router as playlist_router
from src.adapters._fastapi.settings_routes import router as settings_router
from src.adapters._fastapi.stats_routes import router as stats_router
from src.adapters._fastapi.stream_routes import router as stream_router
from src.adapters._fastapi.user_routes import router as user_router
from src.adapters._rabbit.bots.da import router as rmq_da_router
from src.adapters._rabbit.bots.donatepay import router as rmq_donatepay_router
from src.adapters._rabbit.bots.donatex import router as rmq_donatex_router
from src.adapters._rabbit.bots.twitch import router as rmq_twitch_router
from src.adapters._rabbit.broker import get_broker as get_rabbit_broker
from src.adapters._sio.init import sio
from src.adapters._sio.routes import BasicNamespace, PlstUpdsNamespace, WidgetsNamespace
from src.adapters.admin.setup import setup_admin
from src.adapters.admin.views import *  # noqa: F401, F403
from src.dal._redis.broker import get_broker
from src.database import async_session_maker
from src.services.permitions.permition_service import load_feature_flags
from src.services.realtime.sio_playlist import room_manager
from src.settings import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with async_session_maker() as session:
        await load_feature_flags(session)

    rmq_broker = get_rabbit_broker()
    rmq_broker.include_routers(rmq_donatex_router, rmq_twitch_router, rmq_da_router, rmq_donatepay_router)
    await rmq_broker.start()

    get_broker().connect()

    room_manager.start_up()

    yield

    get_broker().close()
    await rmq_broker.stop()


app = FastAPI(lifespan=lifespan)
setup_admin(app)


sio.register_namespace(WidgetsNamespace("/widget"))
sio.register_namespace(PlstUpdsNamespace("/plst_upds"))
sio.register_namespace(BasicNamespace("/"))


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://admin.socket.io",
        "http://localhost:3000",
        "https://localhost:3000",
        "http://127.0.0.1:3000",
        "https://127.0.0.1:3000",
        "http://localhost:8000",
        "https://localhost:8000",
        "http://127.0.0.1:8000",
        "https://127.0.0.1:8000",
        "https://openplaylist.localhost",
        "https://theopenplaylist.com",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)
api_route = APIRouter(prefix="/api")
api_route.include_router(login_router)
api_route.include_router(user_router)
api_route.include_router(order_router)
api_route.include_router(playlist_router)
api_route.include_router(channel_moderator_router)
api_route.include_router(playlist_mod_router)
api_route.include_router(player_router)
api_route.include_router(settings_router)
api_route.include_router(stream_router)
api_route.include_router(playback_router)
api_route.include_router(notificattions_router)
api_route.include_router(feedback_router)
api_route.include_router(stats_router)
api_route.include_router(history_router)
# app.add_route("/api/socket.io/", route=sio_asgi_app, methods=["GET", "POST"])
# app.add_api_websocket_route("/api/socket.io/", sio_asgi_app)


@api_route.post("/logout")
async def logout(response: Response):
    response.delete_cookie(settings.COOKIE_NAME)


app.include_router(api_route)


@app.get("/health")
async def root():
    return {"status": "ok"}


sio_asgi_app = socketio.ASGIApp(socketio_server=sio, other_asgi_app=app, socketio_path="/api/socket.io")

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:sio_asgi_app",
        host=settings.SELF_HOST,
        port=settings.SELF_PORT,
        log_level=settings.SELF_LOG_LEVEL,
        reload=settings.SELF_RELOAD,
    )
