from contextlib import asynccontextmanager

from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware

import socketio

from adapters._fastapi.login_routes import router as login_router
from adapters._fastapi.user_routes import router as user_router
from adapters._fastapi.order_routes import router as order_router
from adapters._fastapi.playlist_routes import router as playlist_router
from adapters._sio.init import sio
from adapters._rabbit.event_broker import broker, declare
from adapters._redis.broker import redis_adapter
from adapters._sio.routes import PlstUpdsNamespace
from settings import settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    await broker.start()
    await declare()
    redis_adapter.connect()
    yield
    redis_adapter.close()
    await broker.stop()


app = FastAPI(lifespan=lifespan)

sio.register_namespace(PlstUpdsNamespace("/plst_upds"))
sio_asgi_app = socketio.ASGIApp(socketio_server=sio, other_asgi_app=app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://localhost:3000",
        "http://127.0.0.1:3000",
        "https://127.0.0.1:3000",
        "https://openplaylist.localhost",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(login_router)
app.include_router(user_router)
app.include_router(order_router)
app.include_router(playlist_router)
app.add_route("/socket.io/", route=sio_asgi_app, methods=["GET", "POST"])
app.add_websocket_route("/socket.io/", sio_asgi_app)


@app.post("/logout")
async def logout(response: Response):
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
