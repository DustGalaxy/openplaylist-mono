from src.dal._redis.broker import get_broker, RedisAdapter


class RoomManager:
    def __init__(self, redis: RedisAdapter):
        self.redis_adapter: RedisAdapter = redis

    def enter_room(self, sid: str, room: str, namespace: str = "/") -> None:
        with self.redis_adapter.broker.pipeline(transaction=True) as pipe:
            pipe.sadd(f"{namespace}:rooms-to-sids:{room}", sid)
            pipe.sadd(f"{namespace}:sids-to-rooms:{sid}", room)
            pipe.execute()

    def leave_room(self, sid: str, room: str, namespace: str = "/") -> None:
        with self.redis_adapter.broker.pipeline(transaction=True) as pipe:
            pipe.srem(f"{namespace}:rooms-to-sids:{room}", sid)
            pipe.srem(f"{namespace}:sids-to-rooms:{sid}", room)
            pipe.execute()

    def get_rooms(self, sid: str, namespace: str = "/") -> set[str]:
        return self.redis_adapter.smembers(f"{namespace}:sids-to-rooms:{sid}")  # pyright: ignore[reportReturnType]

    def get_sids(self, room: str, namespace: str = "/") -> set[str]:
        return self.redis_adapter.smembers(f"{namespace}:rooms-to-sids:{room}")  # pyright: ignore[reportReturnType]

    def clear_room(self, room: str, namespace: str = "/") -> None:
        room_key = f"{namespace}:rooms-to-sids:{room}"
        sids = self.redis_adapter.smembers(room_key)
        if not sids:
            return

        with self.redis_adapter.broker.pipeline(transaction=True) as pipe:
            for sid in sids:  # pyright: ignore[reportGeneralTypeIssues]
                pipe.srem(f"{namespace}:sids-to-rooms:{sid}", room)

            pipe.delete(room_key)
            pipe.execute()

    def disconnect(self, sid: str, namespace: str = "/") -> None:
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
