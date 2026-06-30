from uuid import UUID

import socketio

from src.adapters._sio.init import sio
from src.dal._redis.broker import get_broker


class SioWidgetService:
    def __init__(self, sio):
        self.sio: socketio.AsyncServer = sio
        self.namespace = "/widget"

    async def uid_from_sid(self, sid):
        return await self.sio.get_session(sid, self.namespace)

    def sid_from_uid(self, user_id: str | UUID):
        return str(get_broker().hget(f"widget:users:{user_id}", "sid"))

    async def emit(
        self, event, data=None, to=None, room=None, skip_sid=None, namespace=None, callback=None, ignore_queue=False
    ):
        await self.sio.emit(
            event, data, to, room, skip_sid, namespace if namespace else self.namespace, callback, ignore_queue
        )

    async def current_track(self, track: dict, user_id: str | UUID):
        sid = self.sid_from_uid(user_id)
        await self.emit("current_track", track, to=sid)


sio_widget_service = SioWidgetService(sio)
