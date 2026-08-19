from uuid import UUID

from fastapi import HTTPException, status
from simple_repository.exceptions import NotFoundException

from src.dal.postgres.order_note import OrderNoteRepository, order_note_repository
from src.dal.postgres.playlist import PlaylistRepository, playlist_repository
from src.database import AsyncSession
from src.dto.order_note import OrderNoteResponse, OrderNoteUpsert


class OrderNoteService:
    def __init__(
        self,
        _order_note_repo: OrderNoteRepository = order_note_repository,
        _playlist_repo: PlaylistRepository = playlist_repository,
    ):
        self._note_repo = _order_note_repo
        self._playlist_repo = _playlist_repo

    async def get_note(
        self,
        session: AsyncSession,
        playlist_id: UUID,
        order_id: UUID,
        user_id: UUID | None = None,
    ) -> OrderNoteResponse:
        try:
            playlist = await self._playlist_repo.get_one(session, playlist_id)
        except NotFoundException:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Playlist not found")

        note = await self._note_repo.get_note(session, playlist_id, order_id)
        if not note:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")

        if not note.is_public and (not user_id or user_id != playlist.owner_id):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")

        return note

    async def upsert_note(
        self,
        session: AsyncSession,
        playlist_id: UUID,
        order_id: UUID,
        user_id: UUID,
        data: OrderNoteUpsert,
    ) -> OrderNoteResponse:
        try:
            playlist = await self._playlist_repo.get_one(session, playlist_id)
        except NotFoundException:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Playlist not found")

        if playlist.owner_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only playlist owner can add or edit notes",
            )

        try:
            return await self._note_repo.upsert_note(
                session, playlist_id, order_id, data.note, data.is_public
            )
        except NotFoundException:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Order not found in playlist",
            )

    async def delete_note(
        self,
        session: AsyncSession,
        playlist_id: UUID,
        order_id: UUID,
        user_id: UUID,
    ) -> None:
        try:
            playlist = await self._playlist_repo.get_one(session, playlist_id)
        except NotFoundException:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Playlist not found")

        if playlist.owner_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only playlist owner can delete notes",
            )

        try:
            await self._note_repo.delete_note(session, playlist_id, order_id)
        except NotFoundException:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Note not found",
            )


order_note_service = OrderNoteService()


def get_order_note_service() -> OrderNoteService:
    return order_note_service
