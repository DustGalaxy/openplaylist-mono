import socketio

from src.settings import settings

mgr = socketio.AsyncRedisManager(url=f"{settings.REDIS_URL}/1")
sio = socketio.AsyncServer(
    async_mode="asgi",
    client_manager=mgr,
    cors_allowed_origins=[
        "https://openplaylist.midnull.space",  # Твой боевой домен
        "https://openplaylist.localhost",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
)
# sio.instrument(
#     auth={
#         "username": "admin",
#         "password": "admin123",
#     }
# )
