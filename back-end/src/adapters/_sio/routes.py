import jwt
import socketio

from src.settings import settings
from src.services.sio_service import sio_service, room_manager
from src.adapters._redis.broker import get_broker

from src.adapters._sio.init import sio


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
                get_broker().hset(f"basic:users:{user['sub']}", "sid", sid)
            else:
                print("Кука 'auth' не найдена.")
                # Опционально, можно отключить клиента, если аутентификация не прошла
                await sio.disconnect(sid)
        else:
            print("Куки не переданы.")
            await sio.disconnect(sid)

    async def on_disconnect(self, sid, namespace=None):
        print("disconnect ", sid)
        user_id = await self.get_session(sid)
        get_broker().hdel(f"basic:users:{user_id}", "sid")
        await self.disconnect(sid)


class PlstUpdsNamespace(socketio.AsyncNamespace):
    def get_auth(self, cookie_string) -> str | None:

        def parse_cookies(cookie_str):
            cookies = {}
            for item in cookie_str.split(";"):
                if "=" in item:
                    key, value = item.strip().split("=", 1)
                    cookies[key] = value
            return cookies

        parsed_cookies = parse_cookies(cookie_string)
        auth = parsed_cookies.get("auth")
        return auth

    async def on_connect(self, sid, environ, auth):
        print(f"Новый клиент подключился к PlstUpds с sid: {sid}")

        cookie_string = environ.get("HTTP_COOKIE")
        if not cookie_string:
            print("Куки не переданы.")
            await sio.disconnect(sid, namespace="/plst_upds")
            return

        if auth := self.get_auth(cookie_string):
            print("Найден auth")
            user = jwt.decode(auth, settings.JWT_PUBLIC_KEY, algorithms=[settings.JWT_ALGORITHM])

            await self.save_session(sid, {"user_id": user["sub"]})
            get_broker().hset(f"playlist:users:{user['sub']}", "sid", sid)
        else:
            print("Кука 'auth' не найдена.")
            await sio.disconnect(sid, namespace="/plst_upds")

    async def on_subscribe(self, sid, data):
        user = await self.get_session(sid)
        if user:
            await sio_service.sub_plst_upds(sid, data["playlist_id"], user["user_id"])

    async def on_unsubscribe(self, sid, data):
        user = await self.get_session(sid)
        if user:
            await sio_service.unsub_plst_upds(sid, data["playlist_id"], user["user_id"])

    async def on_disconnect(self, sid, namespace=None):
        print("disconnect ", sid, namespace)
        room_manager.disconnect(sid, namespace="/plst_upds")
        await self.disconnect(sid, namespace="/plst_upds")
