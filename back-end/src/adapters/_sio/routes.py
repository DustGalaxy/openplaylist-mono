import logging

import jwt
import socketio
from fastapi import HTTPException

from src.services.stream_service import StreamService
from src.settings import settings
from src.services.realtime.sio_playlist import sio_playlist_service, room_manager
from src.services.realtime.sio_widget import sio_widget_service
from src.dal._redis.broker import get_broker
from src.database import async_session_maker

logger = logging.getLogger("uvicorn.error")


class BaseNamespace(socketio.AsyncNamespace):
    """Базовый класс для неймспейсов с общими утилитами и логированием."""

    def __init__(self, namespace: str, redis_prefix: str):
        super().__init__(namespace)
        self.namespace = namespace
        self.redis_prefix = redis_prefix

    def _get_auth_from_cookies(self, environ) -> str | None:
        cookie_string = environ.get("HTTP_COOKIE")
        if not cookie_string:
            return None

        cookies = {}
        for item in cookie_string.split(";"):
            if "=" in item:
                key, value = item.strip().split("=", 1)
                cookies[key] = value
        return cookies.get("auth")

    async def _authenticate_via_cookie(self, sid, environ) -> str | None:
        auth = self._get_auth_from_cookies(environ)
        if not auth:
            logger.warning(f"Namespace {self.namespace}: Auth cookie missing for sid {sid}")
            return None

        try:
            user = jwt.decode(auth, settings.JWT_PUBLIC_KEY, algorithms=[settings.JWT_ALGORITHM])
            user_id = str(user["sub"])

            await self.save_session(sid, {"user_id": user_id}, self.namespace)
            get_broker().hset(f"{self.redis_prefix}:users:{user_id}", "sid", sid)
            return user_id
        except Exception as e:
            logger.error(f"Namespace {self.namespace}: JWT decode failed for sid {sid}: {e}")
            return None

    async def _clean_redis_session(self, sid):
        session = await self.get_session(sid, self.namespace)
        if session and "user_id" in session:
            user_id = session["user_id"]
            get_broker().hdel(f"{self.redis_prefix}:users:{user_id}", "sid")


class BasicNamespace(BaseNamespace):
    def __init__(self, namespace: str):
        super().__init__(namespace, redis_prefix="basic")

    async def on_connect(self, sid, environ, auth):
        logger.info(f"Connect: sid {sid} to {self.namespace}")
        user_id = await self._authenticate_via_cookie(sid, environ)
        if not user_id:
            return False

    async def on_disconnect(self, sid, namespace=None):
        logger.info(f"Disconnect: sid {sid} from {self.namespace}")
        await self._clean_redis_session(sid)


class PlstUpdsNamespace(BaseNamespace):
    def __init__(self, namespace: str):
        super().__init__(namespace, redis_prefix="playlist")

    async def on_connect(self, sid, environ, auth):
        logger.info(f"Connect: sid {sid} to {self.namespace}")
        user_id = await self._authenticate_via_cookie(sid, environ)
        if not user_id:
            return False

    async def on_subscribe(self, sid, data):
        session = await self.get_session(sid, self.namespace)
        if session and "user_id" in session:
            playlist_id = data.get("playlist_id")
            logger.info(f"Subscribe: sid {sid} (user {session['user_id']}) to playlist {playlist_id}")
            await sio_playlist_service.sub_plst_upds(sid, playlist_id, session["user_id"])

    async def on_unsubscribe(self, sid, data):
        session = await self.get_session(sid, self.namespace)
        if session and "user_id" in session:
            playlist_id = data.get("playlist_id")
            logger.info(f"Unsubscribe: sid {sid} (user {session['user_id']}) from playlist {playlist_id}")
            await sio_playlist_service.unsub_plst_upds(sid, playlist_id, session["user_id"])

    async def on_disconnect(self, sid, namespace=None):
        logger.info(f"Disconnect: sid {sid} from {self.namespace}")
        room_manager.disconnect(sid, namespace=self.namespace)
        await self._clean_redis_session(sid)


class WidgetsNamespace(BaseNamespace):
    def __init__(self, namespace: str):
        super().__init__(namespace, redis_prefix="widget")
        self.stream_service = StreamService()

    async def on_connect(self, sid, environ, auth):
        logger.info(f"Connect: sid {sid} to {self.namespace}")

        if not auth or "token" not in auth:
            logger.warning(f"Disconnect: sid {sid} rejected, token missing in auth")
            return False

        try:
            async with async_session_maker() as db_session:
                user_id = await self.stream_service.verify_token(db_session, auth["token"])

                await self.save_session(sid, {"user_id": user_id}, self.namespace)
                get_broker().hset(f"{self.redis_prefix}:users:{user_id}", "sid", sid)

                current_track = await self.stream_service.get_current_playing_track(db_session, user_id)
                logger.info(f"current_track: {current_track}")
                if current_track:
                    await sio_widget_service.current_track(current_track, user_id)

        except HTTPException:
            logger.warning(f"Disconnect: sid {sid} rejected, invalid widget token")
            return False
        except Exception as e:
            logger.error(f"Internal error on widget connect (sid {sid}): {e}")
            return False

    async def on_disconnect(self, sid, namespace=None):
        logger.info(f"Disconnect: sid {sid} from {self.namespace}")
        await self._clean_redis_session(sid)
        await self.disconnect(sid, namespace=self.namespace)
