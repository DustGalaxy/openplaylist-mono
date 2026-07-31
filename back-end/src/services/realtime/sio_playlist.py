from typing import Literal
from uuid import UUID

import socketio

from src.adapters._sio.init import sio
from src.dal._redis.broker import get_broker
from src.dal.postgres.playlist import playlist_repository
from src.database import async_session_maker
from src.dto.events import (
    Deleted,
    Moved,
    PlayNow,
    Private,
)
from src.dto.internal.domain_events import PlaylistSettings
from src.dto.playback import Pause, Seek
from src.models.order import OrderDomain
from src.models.playlist_logs import PlaylistLogSchema

from .sio_room_manager import room_manager


class SioPlaylistUpdateService:
    def __init__(self, sio: socketio.AsyncServer):
        self.sio: socketio.AsyncServer = sio
        self.namespace: Literal["/plst_upds"] = "/plst_upds"

    async def uid_from_sid(self, sid: str) -> str | UUID:
        return await self.sio.get_session(sid, self.namespace)

    def sid_from_uid(self, user_id: str | UUID) -> str:
        return str(get_broker().hget(f"playlist:users:{user_id}", "sid"))

    async def log(self, log: PlaylistLogSchema):
        owner_sid = self.sid_from_uid(log.user_id)
        await self.sio.emit(f"log:{log.playlist_id}", log.model_dump(), to=owner_sid, namespace=self.namespace)

    async def set_playnow(self, data: PlayNow):
        sids = room_manager.get_sids(data.playlist_id, self.namespace)
        await self.sio.emit(f"playnow:{data.playlist_id}", data.model_dump(), to=[*sids], namespace=self.namespace)

    async def add_track(self, data: OrderDomain, playlist_id: UUID):
        sids = room_manager.get_sids(str(playlist_id), self.namespace)
        await self.sio.emit(f"add_track:{playlist_id}", data.model_dump(), to=[*sids], namespace=self.namespace)

    async def delete_track(self, data: Deleted):
        sids = room_manager.get_sids(data.playlist_id, self.namespace)
        await self.sio.emit(
            f"delete_track:{data.playlist_id}",
            {"track_id": data.track_id},
            to=[*sids],
            namespace=self.namespace,
        )

    async def bulk_delete_tracks(self, ids, playlist_id: UUID):
        sids = room_manager.get_sids(str(playlist_id), self.namespace)
        await self.sio.emit(
            f"bulk_delete_tracks:{playlist_id!s}",
            {"ids": ids},
            to=[*sids],
            namespace=self.namespace,
        )

    async def pause(self, playlist_id: UUID, data: Pause):
        sids = room_manager.get_sids(f"playback:{playlist_id!s}", self.namespace)
        await self.sio.emit(
            f"playback_pause:{playlist_id!s}",
            data.model_dump(),
            to=[*sids],
            namespace=self.namespace,
        )

    async def seek(self, playlist_id: UUID, data: Seek):
        sids = room_manager.get_sids(f"playback:{playlist_id!s}", self.namespace)
        await self.sio.emit(
            f"playback_seek:{playlist_id!s}",
            data.model_dump(),
            to=[*sids],
            namespace=self.namespace,
        )

    async def move_track(self, data: Moved):
        sids = room_manager.get_sids(data.playlist_id, self.namespace)
        await self.sio.emit("move_track", data, to=[*sids], namespace=self.namespace)

    async def settings_changed(self, data: PlaylistSettings):
        sids = room_manager.get_sids(str(data.id), self.namespace)
        await self.sio.emit(
            f"settings_changed:{data.id!s}",
            data.model_dump(),
            to=[*sids],
            namespace=self.namespace,
        )

    async def ack_bot_connection(self, type: str, user_id: str, platform_user_id: str):
        sid = get_broker().hget(f"basic:users:{user_id}", "sid")
        print("ack bot connection with sid: ", sid, " and type: ", type)
        await self.sio.emit(f"ack_bot_connected:{type.lower()}", data=platform_user_id, to=sid, namespace="/")

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

    async def sub_playback(self, sid: str, playlist_id: UUID, user_id: str):
        async with async_session_maker() as session:
            plst = await playlist_repository.get_one(session, playlist_id)

        print(f"ℹ️ Пользователь {user_id} хочет войти в комнату playback:{playlist_id}, owner_id={plst.owner_id}")
        if (user_id == str(plst.owner_id)) or plst.is_public:
            await self.sio.emit("playback_subscribe_success", to=sid, namespace=self.namespace)
            room_manager.enter_room(sid, f"playback:{playlist_id!s}", self.namespace)
            print(f"➡️ Пользователь {user_id} вошел в комнату {playlist_id}")

        else:
            await self.sio.emit("playback_subscribe_denied", {"room_id": playlist_id}, to=sid, namespace=self.namespace)

    async def unsub_playback(self, sid: str, playlist_id: UUID, user_id: str):
        room_manager.leave_room(sid, f"playback:{playlist_id!s}", namespace=self.namespace)
        print(f"⬅️ Пользователь {user_id} вышел из комнаты playback:{playlist_id}")

    async def sub_plst_upds(self, sid: str, playlist_id: UUID, user_id: str):
        async with async_session_maker() as session:
            plst = await playlist_repository.get_one(session, playlist_id)

        print(f"ℹ️ Пользователь {user_id} хочет войти в комнату {playlist_id}, owner_id={plst.owner_id}")
        if (user_id == str(plst.owner_id)) or plst.is_public:
            await self.sio.emit("subscribe_success", to=sid, namespace=self.namespace)
            room_manager.enter_room(sid, str(playlist_id), self.namespace)
            print(f"➡️ Пользователь {user_id} вошел в комнату {playlist_id}")

        else:
            await self.sio.emit("subscribe_denied", {"room_id": playlist_id}, to=sid, namespace=self.namespace)

    async def unsub_plst_upds(self, sid: str, playlist_id: UUID, user_id: UUID):
        room_manager.leave_room(sid, str(playlist_id), namespace=self.namespace)
        print(f"⬅️ Пользователь {user_id} вышел из комнаты {playlist_id}")


sio_playlist_service = SioPlaylistUpdateService(sio)
