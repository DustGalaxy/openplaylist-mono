from src.models import model_rebuild

model_rebuild()

from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware

import socketio

from src.adapters._fastapi.login_routes import router as login_router
from src.adapters._fastapi.user_routes import router as user_router
from src.adapters._fastapi.order_routes import router as order_router
from src.adapters._fastapi.playlist_routes import router as playlist_router
from src.adapters._fastapi.settings_routes import router as settings_router
from src.adapters._sio.init import sio
from src.adapters._rabbit import broker, declare
from src.dal._redis.broker import get_broker
from src.adapters._sio.routes import PlstUpdsNamespace, BasicNamespace
from src.services.sio_service import room_manager

from src.settings import settings


@asynccontextmanager
async def lifespan(app: FastAPI):

    await broker.start()
    await declare()
    get_broker().connect()

    room_manager.start_up()

    yield
    get_broker().close()
    await broker.stop()


app = FastAPI(lifespan=lifespan)

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
api_route.include_router(settings_router)
# app.add_route("/api/socket.io/", route=sio_asgi_app, methods=["GET", "POST"])
# app.add_api_websocket_route("/api/socket.io/", sio_asgi_app)

app.include_router(api_route)


@app.post("/api/logout")
async def logout(response: Response):
    response.delete_cookie(settings.COOKIE_NAME)


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
