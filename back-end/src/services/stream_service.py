import hashlib
import secrets
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from src.dal.postgres.stream_token import get_stream_token_repository
from src.models.stream_token import StreamTokenSchema, StreamTokenPatch

from src.dal.postgres.playlist_logs import get_playlist_logs_repository

class StreamService:
    def _hash(self, token: str) -> str:
        return hashlib.sha256(token.encode()).hexdigest()

    def generate_new_token(self, user_id: UUID) -> str:
        """Генерирует публичный токен, содержащий user_id"""
        raw_token = secrets.token_hex(64)  # 128 символов
        # Публичный токен, который отдаем пользователю (в БД не сохраняем)
        public_token = f"{user_id}:{raw_token}"
        print(f"!!!!!! NEW TOKEN - {public_token}")
        return public_token

    async def save(self, db_session: AsyncSession, user_id: UUID, public_token: str):
        # Извлекаем чистый токен из публичной строки и хешируем его
        _, raw_token = public_token.split(":", 1)
        token_hash = self._hash(raw_token)
        
        repo = get_stream_token_repository()
        print(f"!!!!!! TOKEN TO SAVE - {public_token}")
        print(f"!!!!!! TOKEN HASH TO SAVE - {token_hash}")
        await repo.upsert(db_session, user_id, token_hash)

    async def get_current_playing_track(self, db_session: AsyncSession, user_id: UUID):
        data = await get_playlist_logs_repository().get_last_playnow(db_session, user_id)
        if not data:
            return None
        
        return data.event_data

    async def verify_token(self, db_session: AsyncSession, incoming_public_token: str) -> UUID:
        """Проверяет составной токен, пришедший из OBS"""
        try:
            # UUID:HEX
            user_id_str, raw_token = incoming_public_token.split(":", 1)
            user_id = UUID(user_id_str)
        except ValueError:
            raise HTTPException(status_code=401, detail="Invalid token format")

        # Безопасный поиск по UUID (индекс)
        stored = await get_stream_token_repository().get_one(db_session, user_id)
        if not stored:
            raise HTTPException(status_code=401, detail="Invalid token")

        incoming_hash = self._hash(raw_token)

        # Честная защита от Timing Attack на стороне Python
        if not secrets.compare_digest(incoming_hash, stored.token_hash):
            raise HTTPException(status_code=401, detail="Invalid token")

        return user_id


_stream_token_service = StreamService()


def get_stream_service():
    return _stream_token_service
