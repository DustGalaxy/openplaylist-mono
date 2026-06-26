from fastapi import HTTPException
import jwt
import socketio

from src.services.stream_service import StreamService
from src.settings import settings
from src.services.realtime.sio_playlist import sio_playlist_service, room_manager
from src.dal._redis.broker import get_broker

from src.database import async_session_maker
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
            await sio_playlist_service.sub_plst_upds(sid, data["playlist_id"], user["user_id"])

    async def on_unsubscribe(self, sid, data):
        user = await self.get_session(sid)
        if user:
            await sio_playlist_service.unsub_plst_upds(sid, data["playlist_id"], user["user_id"])

    async def on_disconnect(self, sid, namespace=None):
        print("disconnect ", sid, namespace)
        room_manager.disconnect(sid, namespace="/plst_upds")
        await self.disconnect(sid, namespace="/plst_upds")


class WidgetsNamespace(socketio.AsyncNamespace):
    def __init__(self, namespace=None):
        super().__init__(namespace)
        self.stream_service = StreamService()

    async def on_connect(self, sid, environ, auth):
        print(f"Новое подключение к /widgets, sid: {sid}")
        
        if not auth or "token" not in auth:
            print("Отклонено: токен отсутствует в auth")
            return False  # В socketio возвращение False внутри on_connect отклоняет соединение

        incoming_token = auth["token"]

        try:
            # Открываем сессию БД, если она нужна внутри репозиториев сервиса
            async with async_session_maker() as db_session:
                # 1. Валидируем составной токен и извлекаем user_id
                user_id = await self.stream_service.verify_token(db_session, incoming_token)
                
                # 2. Сохраняем внутреннюю сессию socket.io
                await self.save_session(sid, {"user_id": str(user_id)})
                
                # 3. Маппим user_id -> sid в Redis
                get_broker().hset(f"widget:users:{user_id}", "sid", sid)
                
                # 4. Прогрев данных: получаем последний играющий трек и сразу шлем его на этот sid
                current_track = await self.stream_service.get_current_playing_track(db_session, user_id)
                if current_track:
                    await self.emit("current_track", current_track, to=sid)
                    
        except HTTPException:
            print("Отклонено: невалидный токен виджета")
            return False
        except Exception as e:
            print(f"Внутренняя ошибка при подключении виджета: {e}")
            return False

    async def on_disconnect(self, sid):
        print(f"Виджет отключился, sid: {sid}")
        session = await self.get_session(sid)
        if session and "user_id" in session:
            user_id = session["user_id"]
            # Чистим привязку в Redis
            get_broker().hdel(f"widget:users:{user_id}", "sid")