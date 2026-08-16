import logging
from uuid import UUID

from simple_repository.exceptions import NotFoundException, RepositoryException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.dto.order_note import OrderNoteResponse
from src.orm.playlist import OrderPlaylistStatus

logger = logging.getLogger(__name__)


class OrderNoteRepository:
    async def get_note(
        self, session: AsyncSession, playlist_id: UUID, order_id: UUID
    ) -> OrderNoteResponse | None:
        stmt = select(OrderPlaylistStatus).where(
            OrderPlaylistStatus.playlist_id == playlist_id,
            OrderPlaylistStatus.order_id == order_id,
        )
        res = await session.execute(stmt)
        status = res.scalar_one_or_none()
        if not status or status.note is None:
            return None

        return OrderNoteResponse(
            order_id=status.order_id,
            playlist_id=status.playlist_id,
            note=status.note,
            is_public=status.is_note_public,
        )

    async def upsert_note(
        self, session: AsyncSession, playlist_id: UUID, order_id: UUID, note: str, is_public: bool
    ) -> OrderNoteResponse:
        try:
            stmt = select(OrderPlaylistStatus).where(
                OrderPlaylistStatus.playlist_id == playlist_id,
                OrderPlaylistStatus.order_id == order_id,
            )
            res = await session.execute(stmt)
            status = res.scalar_one_or_none()
            if not status:
                raise NotFoundException(f"Order {order_id} not found in playlist {playlist_id}")

            status.note = note
            status.is_note_public = is_public
            await session.commit()
            await session.refresh(status)

            return OrderNoteResponse(
                order_id=status.order_id,
                playlist_id=status.playlist_id,
                note=status.note,
                is_public=status.is_note_public,
            )
        except IntegrityError as e:
            await session.rollback()
            raise RepositoryException(f"Database error while saving note: {e}") from e
        except Exception as e:
            await session.rollback()
            if not isinstance(e, NotFoundException):
                raise RepositoryException(f"Unexpected error while saving note: {e}") from e
            raise

    async def delete_note(
        self, session: AsyncSession, playlist_id: UUID, order_id: UUID
    ) -> bool:
        try:
            stmt = select(OrderPlaylistStatus).where(
                OrderPlaylistStatus.playlist_id == playlist_id,
                OrderPlaylistStatus.order_id == order_id,
            )
            res = await session.execute(stmt)
            status = res.scalar_one_or_none()
            if not status:
                raise NotFoundException(f"Order {order_id} not found in playlist {playlist_id}")

            if status.note is None:
                raise NotFoundException(f"Note for order {order_id} not found")

            status.note = None
            status.is_note_public = True
            await session.commit()
            return True
        except Exception as e:
            await session.rollback()
            if not isinstance(e, NotFoundException):
                raise RepositoryException(f"Unexpected error while deleting note: {e}") from e
            raise


order_note_repository = OrderNoteRepository()
