import socketio

from settings import settings

mgr = socketio.AsyncRedisManager(url=f"{settings.REDIS_URL}/0")
sio = socketio.AsyncServer(
    async_mode="asgi", client_manager=mgr, cors_allowed_origins=[],
)
sio.instrument(auth={
    'username': 'admin',
    'password': "admin123",
})    