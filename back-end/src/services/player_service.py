from datetime import datetime
from typing import Any
from uuid import UUID

from fastapi import HTTPException, status
from simple_repository.exceptions import NotFoundException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.dal._redis.player_repository import player_repository
from src.dto.player import (
    PlayerBroadcastRequest,
    PlayerPauseRequest,
    PlayerPlayRequest,
    PlayerSeekRequest,
    PlayerState,
    PlayerVolumeRequest,
)
from src.models.order import OrderDomain
from src.orm.playlist import Order, OrderPlaylistStatus, Playlist
from src.services.realtime.sio_playlist import sio_playlist_service
from src.services.realtime.sio_widget import sio_widget_service


class PlayerService:
    def __init__(self, player_repo=player_repository):
        self.player_repo = player_repo

    async def get_state(self, owner_id: UUID) -> PlayerState | None:
        return await self.player_repo.get_player_state(owner_id)

    async def play_track(
        self,
        db_session: AsyncSession,
        owner_id: UUID,
        data: PlayerPlayRequest,
    ) -> PlayerState:
        # Fetch track info from database
        try:
            track_uuid = UUID(data.track_id)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid track_id")

        stmt = (
            select(Order)
            .join(OrderPlaylistStatus, OrderPlaylistStatus.order_id == Order.id)
            .where(
                Order.id == track_uuid,
                OrderPlaylistStatus.playlist_id == data.playlist_id,
            )
        )
        res = await db_session.execute(stmt)
        order_orm = res.unique().scalar_one_or_none()

        if not order_orm:
            # Try fetching order directly
            stmt_order = select(Order).where(Order.id == track_uuid)
            res_order = await db_session.execute(stmt_order)
            order_orm = res_order.unique().scalar_one_or_none()

        if not order_orm:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Track not found")

        track_domain = OrderDomain.model_validate(order_orm)
        track_dict = track_domain.model_dump(mode="json")
        track_dict["id"] = str(track_domain.id)
        track_dict["playlist_id"] = str(data.playlist_id)

        # Save to Redis
        state_data = {
            "owner_id": str(owner_id),
            "active_playlist_id": str(data.playlist_id),
            "current_track_id": str(data.track_id),
            "current_track_data": track_dict,
            "position": data.position,
            "is_paused": False,
            "last_client_id": data.client_id,
        }
        self.player_repo.save_state(owner_id, state_data)

        # Realtime broadcast
        await sio_playlist_service.emit_player_track_change(
            owner_id=owner_id,
            track_data=track_dict,
            playlist_id=data.playlist_id,
            client_id=data.client_id,
        )
        await sio_widget_service.current_track(track_dict, owner_id)

        return await self.player_repo.get_player_state(owner_id)

    async def pause(
        self,
        owner_id: UUID,
        data: PlayerPauseRequest,
    ) -> PlayerState | None:
        self.player_repo.save_state(
            owner_id,
            {
                "is_paused": data.is_paused,
                "position": data.position,
                "last_client_id": data.client_id,
            },
        )

        await sio_playlist_service.emit_player_pause(
            owner_id=owner_id,
            is_paused=data.is_paused,
            position=data.position,
            client_id=data.client_id,
        )
        await sio_widget_service.emit(
            "pause",
            {"is_paused": data.is_paused, "position": data.position, "client_id": data.client_id},
            to=sio_widget_service.sid_from_uid(owner_id),
        )

        return await self.player_repo.get_player_state(owner_id)

    async def seek(
        self,
        owner_id: UUID,
        data: PlayerSeekRequest,
    ) -> PlayerState | None:
        self.player_repo.save_state(
            owner_id,
            {
                "position": data.position,
                "last_client_id": data.client_id,
            },
        )

        await sio_playlist_service.emit_player_seek(
            owner_id=owner_id,
            position=data.position,
            client_id=data.client_id,
        )
        await sio_widget_service.emit(
            "seek",
            {"position": data.position, "client_id": data.client_id},
            to=sio_widget_service.sid_from_uid(owner_id),
        )

        return await self.player_repo.get_player_state(owner_id)

    async def set_volume(
        self,
        owner_id: UUID,
        data: PlayerVolumeRequest,
    ) -> PlayerState | None:
        self.player_repo.save_state(
            owner_id,
            {
                "volume": data.volume,
                "last_client_id": data.client_id,
            },
        )

        await sio_playlist_service.emit_player_volume(
            owner_id=owner_id,
            volume=data.volume,
            client_id=data.client_id,
        )

        return await self.player_repo.get_player_state(owner_id)

    async def set_broadcast_to_widget(
        self,
        owner_id: UUID,
        data: PlayerBroadcastRequest,
    ) -> PlayerState | None:
        self.player_repo.save_state(
            owner_id,
            {
                "broadcast_to_widget": data.enabled,
                "last_client_id": data.client_id,
            },
        )
        return await self.player_repo.get_player_state(owner_id)


player_service = PlayerService()


def get_player_service() -> PlayerService:
    return player_service
