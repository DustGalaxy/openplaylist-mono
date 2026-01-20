import socketio

from config import settings

mgr = socketio.AsyncRedisManager(url=f"{settings.REDIS_URL}/0")
sio = socketio.AsyncServer(
    async_mode="asgi", cors_allowed_origins="*", client_manager=mgr
)
