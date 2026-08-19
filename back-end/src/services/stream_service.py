import hashlib
import secrets
from typing import Any
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from src.dal.postgres.playlist_logs import get_playlist_logs_repository
from src.dal.postgres.stream_token import get_stream_token_repository


class StreamService:
    def _hash(self, token: str) -> str:
        return hashlib.sha256(token.encode()).hexdigest()

    def generate_new_token(self, user_id: UUID) -> str:
        """Генерирует публичный токен, содержащий user_id"""
        raw_token = secrets.token_hex(64)  # 128 символов
        public_token = f"{user_id}:{raw_token}"  # UUID:HEX
        return public_token

    async def save(self, db_session: AsyncSession, user_id: UUID, public_token: str):
        _, raw_token = public_token.split(":", 1)
        token_hash = self._hash(raw_token)

        repo = get_stream_token_repository()
        await repo.upsert(db_session, user_id, token_hash)

    async def get_current_playing_track(self, db_session: AsyncSession, user_id: UUID) -> dict[str, Any] | None:
        from src.dal._redis.player_repository import player_repository
        state = await player_repository.get_player_state(user_id)
        if state and state.current_track_data:
            return state.current_track_data
        data = await get_playlist_logs_repository().get_last_playnow(db_session, user_id)
        return data.event_data if data else None

    async def verify_token(self, db_session: AsyncSession, incoming_public_token: str) -> UUID:
        """Проверяет составной токен, пришедший из OBS"""
        try:
            # UUID:HEX
            user_id_str, raw_token = incoming_public_token.split(":", 1)
            user_id = UUID(user_id_str)
        except ValueError:
            raise HTTPException(status_code=401, detail="Invalid token format")

        stored = await get_stream_token_repository().get_one(db_session, user_id)
        if not stored:
            raise HTTPException(status_code=401, detail="Invalid token")

        incoming_hash = self._hash(raw_token)

        if not secrets.compare_digest(incoming_hash, stored.token_hash):
            raise HTTPException(status_code=401, detail="Invalid token")

        return user_id


_stream_token_service = StreamService()


def get_stream_service():
    return _stream_token_service
