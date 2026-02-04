import jwt
import socketio

from settings import settings
from services.sio_service import sio_service
from adapters._redis.broker import redis_adapter

from .init import sio


class BasicNamespace(socketio.AsyncNamespace):
    async def on_connect(self, sid, environ, auth):
        print(f"Новый клиент подключился к Basic с sid: {sid}")

        cookie_string = environ.get("HTTP_COOKIE")
        if cookie_string:
            # Простая функция для парсинга куки
            def parse_cookies(cookie_str):
                cookies = {}
                for item in cookie_str.split(";"):
                    if "=" in item:
                        key, value = item.strip().split("=", 1)
                        cookies[key] = value
                return cookies

            parsed_cookies = parse_cookies(cookie_string)
            auth = parsed_cookies.get("auth")

            if auth:
                print("Найден auth")
                user = jwt.decode(auth, settings.JWT_PUBLIC_KEY, algorithms=[settings.JWT_ALGORITHM])

                await self.save_session(sid, {"user_id": user["sub"]})
                redis_adapter.hset(f"basic:users:{user['sub']}", "sid", sid)
            else:
                print("Кука 'auth' не найдена.")
                # Опционально, можно отключить клиента, если аутентификация не прошла
                await sio.disconnect(sid)
        else:
            print("Куки не переданы.")
            await sio.disconnect(sid)

    async def on_disconnect(self, sid, reason, namespace=None):
        print("disconnect ", sid)
        user_id = await self.get_session(sid)
        redis_adapter.hdel(f"basic:users:{user_id}", "sid")
        await self.disconnect(sid)


class PlstUpdsNamespace(socketio.AsyncNamespace):
    async def on_connect(self, sid, environ, auth):
        print(f"Новый клиент подключился к PlstUpds с sid: {sid}")

        cookie_string = environ.get("HTTP_COOKIE")
        if cookie_string:
            # Простая функция для парсинга куки
            def parse_cookies(cookie_str):
                cookies = {}
                for item in cookie_str.split(";"):
                    if "=" in item:
                        key, value = item.strip().split("=", 1)
                        cookies[key] = value
                return cookies

            parsed_cookies = parse_cookies(cookie_string)
            auth = parsed_cookies.get("auth")

            if auth:
                print("Найден auth")
                user = jwt.decode(auth, settings.JWT_PUBLIC_KEY, algorithms=[settings.JWT_ALGORITHM])

                await self.save_session(sid, {"user_id": user["sub"]})
                redis_adapter.hset(f"playlist:users:{user['sub']}", "sid", sid)
            else:
                print("Кука 'auth' не найдена.")
                # Опционально, можно отключить клиента, если аутентификация не прошла
                await sio.disconnect(sid)
        else:
            print("Куки не переданы.")
            await sio.disconnect(sid)

    async def on_subscribe(self, sid, data):
        user = await self.get_session(sid)
        if user:
            await sio_service.sub_plst_upds(sid, data["playlist_id"], user["user_id"])

    async def on_unsubscribe(self, sid, data):
        user = await self.get_session(sid)
        if user:
            await sio_service.unsub_plst_upds(sid, data["playlist_id"], user["user_id"])

    async def on_disconnect(self, sid, namespace=None):
        print("disconnect ", sid)
        user_id = await self.get_session(sid)
        redis_adapter.hdel(f"playlist:users:{user_id}", "sid")
        await self.disconnect(sid)
