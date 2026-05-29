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
from adapters._redis.broker import get_broker, RedisAdapter
from dal.postgres_impl import playlist_repository
from models.playlist_logs import PlaylistLogSchema
from models.order import OrderDomain
from database import async_session_maker


class RoomManager:
    def __init__(self, redis: RedisAdapter):
        self.redis_adapter = redis

    def enter_room(self, sid: str, room: str, namespace="/") -> None:
        with self.redis_adapter.broker.pipeline(transaction=True) as pipe:
            pipe.sadd(f"{namespace}:rooms-to-sids:{room}", sid)
            pipe.sadd(f"{namespace}:sids-to-rooms:{sid}", room)
            pipe.execute()

    def leave_room(self, sid: str, room: str, namespace="/") -> None:
        with self.redis_adapter.broker.pipeline(transaction=True) as pipe:
            pipe.srem(f"{namespace}:rooms-to-sids:{room}", sid)
            pipe.srem(f"{namespace}:sids-to-rooms:{sid}", room)
            pipe.execute()

    def get_rooms(self, sid: str, namespace="/") -> Set[Any]:
        return self.redis_adapter.smembers(f"{namespace}:sids-to-rooms:{sid}")  # pyright: ignore[reportReturnType]

    def get_sids(self, room: str, namespace="/") -> Set[Any]:
        return self.redis_adapter.smembers(f"{namespace}:rooms-to-sids:{room}")  # pyright: ignore[reportReturnType]

    def clear_room(self, room: str, namespace="/") -> None:
        room_key = f"{namespace}:rooms-to-sids:{room}"
        sids = self.redis_adapter.smembers(room_key)
        if not sids:
            return

        with self.redis_adapter.broker.pipeline(transaction=True) as pipe:
            for sid in sids:  # pyright: ignore[reportGeneralTypeIssues]
                pipe.srem(f"{namespace}:sids-to-rooms:{sid}", room)

            pipe.delete(room_key)
            pipe.execute()

    def disconnect(self, sid: str, namespace="/") -> None:
        sid_rooms_key = f"{namespace}:sids-to-rooms:{sid}"
        rooms = self.redis_adapter.smembers(sid_rooms_key)

        if not rooms:
            return
        print(f"disconnecting {sid} from rooms {rooms}")
        with self.redis_adapter.broker.pipeline(transaction=True) as pipe:
            for room_name in rooms:  # pyright: ignore[reportGeneralTypeIssues]
                pipe.srem(f"{namespace}:rooms-to-sids:{room_name}", sid)

            pipe.delete(sid_rooms_key)
            pipe.execute()

    def start_up(self):
        with self.redis_adapter.broker.pipeline(transaction=True) as pipe:
            pipe.delete("*:rooms-to-sids:*")
            pipe.delete("*:sids-to-rooms:*")
            pipe.execute()


room_manager = RoomManager(get_broker())


class SioPlaylistUpdateService:
    def __init__(self, sio):
        self.sio: socketio.AsyncServer = sio
        self.namespace = "/plst_upds"

    async def uid_from_sid(self, sid):
        return await self.sio.get_session(sid)

    def sid_from_uid(self, user_id):
        return str(get_broker().hget(f"playlist:users:{user_id}", "sid"))

    async def log(self, log: PlaylistLogSchema):
        owner_sid = self.sid_from_uid(log.user_id)
        await self.sio.emit(f"log:{log.playlist_id}", log.model_dump_json(), to=owner_sid, namespace=self.namespace)

    async def set_playnow(self, data: PlayNow):
        sids = room_manager.get_sids(data.playlist_id, self.namespace)
        await self.sio.emit(f"playnow:{data.playlist_id}", data.model_dump_json(), to=[*sids], namespace=self.namespace)

    async def add_track(self, data: OrderDomain, playlist_id: UUID):
        sids = room_manager.get_sids(str(playlist_id), self.namespace)
        await self.sio.emit(f"add_track:{playlist_id}", data.model_dump_json(), to=[*sids], namespace=self.namespace)

    async def delete_track(self, data: Deleted):
        sids = room_manager.get_sids(data.playlist_id, self.namespace)
        await self.sio.emit(
            f"delete_track:{data.playlist_id}",
            {"track_id": data.track_id},
            to=[*sids],
            namespace=self.namespace,
        )

    async def move_track(self, data: Moved):
        sids = room_manager.get_sids(data.playlist_id, self.namespace)
        await self.sio.emit("move_track", data, to=[*sids], namespace=self.namespace)

    async def settings_changed(self, data: ReadPlaylistSettings):
        sids = room_manager.get_sids(str(data.playlist_id), self.namespace)
        await self.sio.emit(
            f"settings_changed:{str(data.playlist_id)}",
            data.model_dump_json(),
            to=[*sids],
            namespace=self.namespace,
        )

    async def ack_bot_connection(self, type: str, user_id: str):
        sid = get_broker().hget(f"basic:users:{user_id}", "sid")
        await self.sio.emit(f"ack_bot_connected:{type}", to=sid, namespace="/")

    async def set_private(self, data: Private):
        room_id = data.playlist_id
        owner_id = data.owner_id
        owner_sid = self.sid_from_uid(owner_id)
        for sid in room_manager.get_sids(room_id, self.namespace):
            if sid == owner_sid:
                continue

            await self.sio.emit("kicked_from_playlist", to=sid, namespace=self.namespace)
            room_manager.leave_room(sid, room_id, self.namespace)
            print(f"⬅️ Пользователь {sid} был выгнан из комнаты {room_id}")

    async def sub_plst_upds(self, sid, playlist_id: UUID, user_id: str):
        async with async_session_maker() as session:
            plst = await playlist_repository.get_one(session, playlist_id)

        print(f"ℹ️ Пользователь {user_id} хочет войти в комнату {playlist_id}, owner_id={plst.owner_id}")
        if (user_id == str(plst.owner_id)) or plst.is_public:
            await self.sio.emit("subscribe_success", to=sid, namespace=self.namespace)
            room_manager.enter_room(sid, str(playlist_id), self.namespace)
            print(f"➡️ Пользователь {user_id} вошел в комнату {playlist_id}")

        else:
            await self.sio.emit("subscribe_denied", {"room_id": playlist_id}, to=sid, namespace=self.namespace)

    async def unsub_plst_upds(self, sid, playlist_id: UUID, user_id: UUID):
        room_manager.leave_room(sid, str(playlist_id), namespace=self.namespace)
        print(f"⬅️ Пользователь {user_id} вышел из комнаты {playlist_id}")


sio_service = SioPlaylistUpdateService(sio)
