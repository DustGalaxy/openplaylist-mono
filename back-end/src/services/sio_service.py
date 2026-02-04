from typing import Any, Set
from uuid import UUID

import socketio

from dto.events import (
    PlayNow,
    Deleted,
    Moved,
    Private,
)
from dto.settings import ReadPlaylistSettings
from adapters._sio.init import sio
from adapters._redis.broker import redis_adapter
from dal.postgres_impl import playlist_repository
from models.order import OrderDomain
from database import async_session_maker


class RoomManager:
    def enter_room(self, sid: str, room: str, namespace="") -> None:
        with redis_adapter.broker.pipeline(transaction=True) as pipe:
            pipe.sadd(f"{namespace}:rooms:{room}", sid)
            pipe.sadd(f"sid:{sid}:{namespace}:rooms", room)
            pipe.execute()

    def leave_room(self, sid: str, room: str, namespace="") -> None:
        with redis_adapter.broker.pipeline(transaction=True) as pipe:
            pipe.srem(f"{namespace}:rooms:{room}", sid)
            pipe.srem(f"sid:{sid}:{namespace}:rooms", room)
            pipe.execute()

    def get_rooms(self, sid: str, namespace="") -> Set[Any]:
        return redis_adapter.smembers(f"sid:{sid}:{namespace}:rooms")  # pyright: ignore[reportReturnType]

    def get_sids(self, room: str, namespace="") -> Set[Any]:
        return redis_adapter.smembers(f"{namespace}:rooms:{room}")  # pyright: ignore[reportReturnType]

    def clear_room(self, room: str, namespace="") -> None:
        room_key = f"{namespace}:rooms:{room}"
        sids = redis_adapter.smembers(room_key)
        if not sids:
            return

        with redis_adapter.broker.pipeline(transaction=True) as pipe:
            for sid in sids:  # pyright: ignore[reportGeneralTypeIssues]
                pipe.srem(f"sid:{sid}:{namespace}:rooms", room)

            pipe.delete(room_key)
            pipe.execute()

    def disconnect(self, sid: str, namespace="") -> None:
        sid_rooms_key = f"sid:{sid}:{namespace}:rooms"
        rooms = redis_adapter.smembers(sid_rooms_key)

        if not rooms:
            return

        with redis_adapter.broker.pipeline(transaction=True) as pipe:
            for room_name in rooms:  # pyright: ignore[reportGeneralTypeIssues]
                pipe.srem(f"{namespace}:rooms:{room_name}", sid)

            pipe.delete(sid_rooms_key)
            pipe.execute()


room_manager = RoomManager()


class SioPlaylistUpdateService:
    def __init__(self, sio):
        self.sio: socketio.AsyncServer = sio
        self.namespace = "/plst_upds"

    async def uid_from_sid(self, sid):
        return await self.sio.get_session(sid)

    def sid_from_uid(self, user_id):
        return str(redis_adapter.hget(f"playlist:users:{user_id}", "sid"))[2:-1]

    async def set_playnow(self, data: PlayNow):
        await self.sio.emit(
            f"playnow:{data.playlist_id}", data.model_dump_json(), room=data.playlist_id, namespace=self.namespace
        )

    async def add_track(self, data: OrderDomain, playlist_id: UUID):
        await self.sio.emit(
            f"add_track:{playlist_id}", data.model_dump_json(), room=str(playlist_id), namespace=self.namespace
        )
        print(f"Трек {data.id} добавлен в плейлист {playlist_id}")

    async def delete_track(self, data: Deleted):
        await self.sio.emit(
            f"delete_track:{data.playlist_id}",
            {"track_id": data.track_id},
            room=data.playlist_id,
            namespace=self.namespace,
        )

    async def move_track(self, data: Moved):
        await self.sio.emit("move_track", data, room=data.playlist_id, namespace=self.namespace)

    async def settings_changed(self, data: ReadPlaylistSettings):
        await self.sio.emit(
            f"settings_changed:{str(data.playlist_id)}",
            data.model_dump_json(),
            room=str(data.playlist_id),
            namespace=self.namespace,
        )

    async def ack_bot_connection(self, type: str, user_id: str):
        sid = str(redis_adapter.hget(f"basic:users:{user_id}", "sid"))[2:-1]
        await self.sio.emit(f"ack_bot_connected:{type}", to=sid, namespace="/")
        print(f"Пользователь {user_id} подключился к боту {type}")
        print(f"данные sid: {sid}, namespace: /, event: ack_bot_connected:{type}")

    async def set_private(self, data: Private):
        room_id = data.playlist_id
        owner_id = data.owner_id

        # Получаем sid владельца по его user_id
        owner_sid = self.sid_from_uid(owner_id)
        print(f"owner_sid: {owner_sid}")
        print(f"rooms: {self.sio.manager.rooms.get(room_id)}")

        # Получаем список всех sid в комнате
        await self.sio.emit(
            "kicked_from_playlist", {"room_id": room_id}, room=room_id, skip_sid=owner_sid, namespace=self.namespace
        )
        # await self.sio.close_room(room_id, namespace=self.namespace)

        for sid in room_manager.get_sids(room_id, self.namespace):
            if sid == owner_sid:
                continue
            room_manager.leave_room(sid, room_id)
            print(f"Пользователь {sid} был выгнан из комнаты {room_id}")

    async def sub_plst_upds(self, sid, playlist_id: UUID, user_id: str):
        async with async_session_maker() as session:
            info = await playlist_repository.get_one(session, playlist_id)

        print(f"Пользователь {user_id} хочет войти в комнату {playlist_id}, owner_id={info.owner_id}")
        if (user_id == str(info.owner_id)) or info.settings.is_public:
            await self.sio.emit("subscribe_success", {"room_id": playlist_id}, to=sid, namespace=self.namespace)
            room_manager.enter_room(f"playlist:{playlist_id}", sid, "plst_upds")
            print(f"Пользователь {user_id} вошел в комнату {playlist_id}")

        else:
            await self.sio.emit("subscribe_denied", {"room_id": playlist_id}, to=sid, namespace=self.namespace)

    async def unsub_plst_upds(self, sid, playlist_id: UUID, user_id: UUID):
        await self.sio.leave_room(sid, playlist_id, namespace=self.namespace)
        print(f"Пользователь {user_id} вышел из комнаты {playlist_id}")


sio_service = SioPlaylistUpdateService(sio)
