from uuid import UUID

import socketio

from dto.events import (
    PlayNow,
    PlaylistTrackAdded,
    Deleted,
    Moved,
    Private,
)
from dto.settings import ReadPlaylistSettings
from adapters._sio.init import sio
from adapters._redis.broker import redis_adapter
from services.playlist_service import playlist_service
from database import async_session_maker


class SioPlaylistUpdateService:
    def __init__(self, sio):
        self.sio: socketio.AsyncServer = sio
        self.namespace = "/plst_upds"

    async def set_playnow(self, data: PlayNow):
        await self.sio.emit("playnow", data.model_dump_json(), room=data.playlist_id, namespace=self.namespace)

    async def add_track(self, data: PlaylistTrackAdded):
        await self.sio.emit("add_track", data.model_dump_json(), room=data.playlist_id, namespace=self.namespace)
        print(f"Трек {data.id} добавлен в плейлист {data.playlist_id}")

    async def delete_track(self, data: Deleted):
        await self.sio.emit(
            "delete_track",
            {"track_id": data.track_id, "playlist_id": data.playlist_id},
            room=data.playlist_id,
            namespace=self.namespace,
        )

    async def move_track(self, data: Moved):
        await self.sio.emit("move_track", data, room=data.playlist_id, namespace=self.namespace)

    async def settings_changed(self, data: ReadPlaylistSettings):
        await self.sio.emit("settings_changed", data.model_dump_json(), room=str(data.playlist_id), namespace=self.namespace)

    async def set_private(self, data: Private):
        room_id = data.playlist_id
        owner_id = data.owner_id

        if room_id and owner_id:
            # Получаем sid владельца по его user_id
            owner_sid = redis_adapter.hget(f"users:{owner_id}", "sid")

            # Получаем список всех sid в комнате
            for sid in self.sio.manager.get_participants(room=room_id, namespace=self.namespace):
                if sid == owner_sid:
                    continue

                # Отправляем событие клиенту, чтобы он знал, что его выгнали
                await self.sio.emit("kicked_from_room", {"room_id": room_id}, to=sid, namespace="/personal_rooms")

                # Отключаем клиента от комнаты на сервере
                await self.sio.leave_room(sid, room_id)
                print(f"Пользователь {sid} был выгнан из комнаты {room_id}")

    async def sub_plst_upds(self, sid, playlist_id: UUID, user_id: str):
        async with async_session_maker() as session:
            info = await playlist_service.get_basic_info(session, playlist_id)

        print(f"Пользователь {user_id} хочет войти в комнату {playlist_id}, owner_id={info.owner_id}")
        if (user_id == str(info.owner_id)) or info.is_public:
            await self.sio.enter_room(sid, playlist_id, namespace=self.namespace)
            await self.sio.emit("subscribe_success", {"room_id": playlist_id}, to=sid, namespace=self.namespace)
            print(f"Пользователь {user_id} вошел в комнату {playlist_id}")
        else:
            await self.sio.emit("subscribe_denied", {"room_id": playlist_id}, to=sid, namespace=self.namespace)

    async def unsub_plst_upds(self, sid, playlist_id: UUID, user_id: UUID):
        await self.sio.leave_room(sid, playlist_id, namespace=self.namespace)
        print(f"Пользователь {user_id} вышел из комнаты {playlist_id}")


sio_service = SioPlaylistUpdateService(sio)
