import secrets
from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, status
from simple_repository.exceptions import NotFoundException
from sqlalchemy.ext.asyncio import AsyncSession

from src.dal.postgres.moderator import (
    ChannelModeratorRepository,
    ModeratorPlaylistAccessRepository,
    channel_moderator_repository,
    moderator_playlist_access_repository,
)
from src.dal.postgres.playlist import PlaylistRepository, playlist_repository
from src.dal.postgres.user import user_repository
from src.dto.moderator import (
    ChannelModeratorResponse,
    CreateChannelModeratorTokenRequest,
    DirectAddChannelModeratorRequest,
    GrantPlaylistAccessRequest,
    ModeratedChannelResponse,
    ModeratorChannelAccessInfo,
    ModeratorPlaylistAccessInfo,
    PlaylistAccessResponse,
    UpdateChannelModeratorRequest,
)
from src.models.moderator import (
    ChannelModeratorCreate,
    ChannelModeratorPatch,
    ModeratorPlaylistAccessCreate,
    ModeratorPlaylistAccessPatch,
)


def _normalize_naive_datetime(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is not None:
        return dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


def _is_datetime_expired(expires_at: datetime | None) -> bool:
    if expires_at is None:
        return False
    now = datetime.now(timezone.utc)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    return expires_at < now


class ModeratorService:
    def __init__(
        self,
        mod_repo: ChannelModeratorRepository = channel_moderator_repository,
        access_repo: ModeratorPlaylistAccessRepository = moderator_playlist_access_repository,
        plst_repo: PlaylistRepository = playlist_repository,
    ):
        self.mod_repo = mod_repo
        self.access_repo = access_repo
        self.plst_repo = plst_repo

    async def create_channel_moderator_token(
        self,
        db_session: AsyncSession,
        owner_id: UUID,
        data: CreateChannelModeratorTokenRequest,
    ) -> ChannelModeratorResponse:
        raw_token = f"mod_{secrets.token_urlsafe(32)}"

        new_mod = ChannelModeratorCreate(
            owner_id=owner_id,
            name=data.name,
            token=raw_token,
            can_control_player=data.can_control_player,
            can_manage_all_playlists=data.can_manage_all_playlists,
            expires_at=_normalize_naive_datetime(data.expires_at),
            is_active=True,
        )

        created = await self.mod_repo.create(db_session, new_mod)
        return ChannelModeratorResponse.model_validate(created)

    async def add_channel_moderator_by_user_id(
        self,
        db_session: AsyncSession,
        owner_id: UUID,
        data: DirectAddChannelModeratorRequest,
    ) -> ChannelModeratorResponse:
        if data.target_user_id == owner_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Channel owner cannot be added as a moderator")

        try:
            target_user = await user_repository.get_one(db_session, data.target_user_id)
        except NotFoundException:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target user not found")

        existing = await self.mod_repo.get_by_owner_and_user(db_session, owner_id, data.target_user_id)
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is already a moderator for this channel")

        raw_token = f"mod_{secrets.token_urlsafe(32)}"

        new_mod = ChannelModeratorCreate(
            owner_id=owner_id,
            user_id=data.target_user_id,
            name=data.name or getattr(target_user, "username", "Moderator"),
            token=raw_token,
            can_control_player=data.can_control_player,
            can_manage_all_playlists=data.can_manage_all_playlists,
            expires_at=_normalize_naive_datetime(data.expires_at),
            is_active=True,
        )

        created = await self.mod_repo.create(db_session, new_mod)
        return ChannelModeratorResponse.model_validate(created)

    async def patch_channel_moderator(
        self,
        db_session: AsyncSession,
        owner_id: UUID,
        moderator_id: UUID,
        data: UpdateChannelModeratorRequest,
    ) -> ChannelModeratorResponse:
        try:
            mod = await self.mod_repo.get_one(db_session, moderator_id)
            if mod.owner_id != owner_id:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Moderator not found")

            patch_data = ChannelModeratorPatch(
                name=data.name,
                can_control_player=data.can_control_player,
                can_manage_all_playlists=data.can_manage_all_playlists,
                expires_at=_normalize_naive_datetime(data.expires_at) if data.expires_at is not None else None,
                is_active=data.is_active,
            )
            updated = await self.mod_repo.patch(db_session, patch_data, moderator_id)
            return ChannelModeratorResponse.model_validate(updated)
        except NotFoundException:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Moderator not found")

    async def claim_channel_moderator_token(
        self,
        db_session: AsyncSession,
        current_user_id: UUID,
        token: str,
    ) -> ChannelModeratorResponse:
        mod = await self.mod_repo.get_by_token(db_session, token)
        if not mod or not mod.is_active:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or inactive moderator token")

        if mod.owner_id == current_user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Channel owner cannot claim a moderator token for their own channel",
            )

        if _is_datetime_expired(mod.expires_at):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Moderator token has expired")

        if mod.user_id is not None:
            if mod.user_id == current_user_id:
                return ChannelModeratorResponse.model_validate(mod)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This moderator token has already been claimed by another user",
            )

        patch_data = ChannelModeratorPatch(user_id=current_user_id)
        updated = await self.mod_repo.patch(db_session, patch_data, mod.id)
        return ChannelModeratorResponse.model_validate(updated)

    async def revoke_channel_moderator(
        self,
        db_session: AsyncSession,
        owner_id: UUID,
        moderator_id: UUID,
    ) -> None:
        try:
            mod = await self.mod_repo.get_one(db_session, moderator_id)
            if mod.owner_id != owner_id:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Moderator not found")
            await self.mod_repo.remove(db_session, moderator_id)
        except NotFoundException:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Moderator not found")

    async def list_channel_moderators(
        self,
        db_session: AsyncSession,
        owner_id: UUID,
    ) -> list[ChannelModeratorResponse]:
        mods = await self.mod_repo.get_all_by_owner(db_session, owner_id)
        return [ChannelModeratorResponse.model_validate(m) for m in mods]

    async def list_moderated_channels(
        self,
        db_session: AsyncSession,
        user_id: UUID,
    ) -> list[ModeratedChannelResponse]:
        mods = await self.mod_repo.get_all_by_moderator_user(db_session, user_id)
        result = []
        for m in mods:
            if _is_datetime_expired(m.expires_at):
                continue
            owner_name = m.owner.username if m.owner else "Channel"
            access_list = [
                PlaylistAccessResponse(
                    id=acc.id,
                    playlist_id=acc.playlist_id,
                    playlist_name=acc.playlist.name if acc.playlist else None,
                    can_manage_tracks=acc.can_manage_tracks,
                    can_manage_settings=acc.can_manage_settings,
                )
                for acc in m.playlist_access
            ]
            result.append(
                ModeratedChannelResponse(
                    moderator_id=m.id,
                    owner_id=m.owner_id,
                    owner_name=str(owner_name),
                    can_control_player=m.can_control_player,
                    can_manage_all_playlists=m.can_manage_all_playlists,
                    playlist_access=access_list,
                    expires_at=m.expires_at,
                )
            )
        return result

    async def grant_playlist_access(
        self,
        db_session: AsyncSession,
        owner_id: UUID,
        moderator_id: UUID,
        data: GrantPlaylistAccessRequest,
    ) -> PlaylistAccessResponse:
        mod = await self.mod_repo.get_one(db_session, moderator_id)
        if mod.owner_id != owner_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Moderator not found")

        plst = await self.plst_repo.get_one(db_session, data.playlist_id)
        if plst.owner_id != owner_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Playlist does not belong to your channel")

        existing = await self.access_repo.get_by_mod_and_playlist(db_session, moderator_id, data.playlist_id)
        if existing:
            patch = ModeratorPlaylistAccessPatch(
                can_manage_tracks=data.can_manage_tracks,
                can_manage_settings=data.can_manage_settings,
            )
            updated = await self.access_repo.patch(db_session, patch, existing.id)
            return PlaylistAccessResponse(
                id=updated.id,
                playlist_id=updated.playlist_id,
                playlist_name=plst.name,
                can_manage_tracks=updated.can_manage_tracks,
                can_manage_settings=updated.can_manage_settings,
            )

        new_access = ModeratorPlaylistAccessCreate(
            moderator_id=moderator_id,
            playlist_id=data.playlist_id,
            can_manage_tracks=data.can_manage_tracks,
            can_manage_settings=data.can_manage_settings,
        )
        created = await self.access_repo.create(db_session, new_access)
        return PlaylistAccessResponse(
            id=created.id,
            playlist_id=created.playlist_id,
            playlist_name=plst.name,
            can_manage_tracks=created.can_manage_tracks,
            can_manage_settings=created.can_manage_settings,
        )

    async def revoke_playlist_access(
        self,
        db_session: AsyncSession,
        owner_id: UUID,
        moderator_id: UUID,
        playlist_id: UUID,
    ) -> None:
        mod = await self.mod_repo.get_one(db_session, moderator_id)
        if mod.owner_id != owner_id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Moderator not found")

        existing = await self.access_repo.get_by_mod_and_playlist(db_session, moderator_id, playlist_id)
        if existing:
            await self.access_repo.remove(db_session, existing.id)

    async def get_channel_access_info(
        self,
        db_session: AsyncSession,
        owner_id: UUID,
        user_id: UUID | None = None,
        token: str | None = None,
    ) -> ModeratorChannelAccessInfo:
        # Check if user is owner
        if user_id and user_id == owner_id:
            return ModeratorChannelAccessInfo(
                owner_id=owner_id,
                user_id=user_id,
                access_level="owner",
                name="Channel Owner",
                can_control_player=True,
                can_manage_all_playlists=True,
            )

        # Check by user_id
        if user_id:
            mod = await self.mod_repo.get_by_owner_and_user(db_session, owner_id, user_id)
            if mod and mod.is_active:
                if _is_datetime_expired(mod.expires_at):
                    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Moderator token expired")
                return ModeratorChannelAccessInfo(
                    owner_id=owner_id,
                    user_id=user_id,
                    access_level="moderator",
                    name=mod.name,
                    can_control_player=mod.can_control_player,
                    can_manage_all_playlists=mod.can_manage_all_playlists,
                )

        # Check by token
        if token:
            mod = await self.mod_repo.get_by_token(db_session, token)
            if mod and mod.owner_id == owner_id and mod.is_active:
                if _is_datetime_expired(mod.expires_at):
                    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Moderator token expired")
                return ModeratorChannelAccessInfo(
                    owner_id=owner_id,
                    user_id=mod.user_id,
                    access_level="moderator",
                    name=mod.name,
                    can_control_player=mod.can_control_player,
                    can_manage_all_playlists=mod.can_manage_all_playlists,
                )

        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    async def get_playlist_access_info(
        self,
        db_session: AsyncSession,
        playlist_id: UUID,
        user_id: UUID | None = None,
        token: str | None = None,
    ) -> ModeratorPlaylistAccessInfo:
        try:
            plst = await self.plst_repo.get_one(db_session, playlist_id)
        except NotFoundException:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Playlist not found")

        # Owner check
        if user_id and user_id == plst.owner_id:
            return ModeratorPlaylistAccessInfo(
                playlist_id=playlist_id,
                user_id=user_id,
                access_level="owner",
                name="Playlist Owner",
                can_manage_tracks=True,
                can_manage_settings=True,
            )

        # Moderator by user_id
        if user_id:
            mod = await self.mod_repo.get_by_owner_and_user(db_session, plst.owner_id, user_id)
            if mod and mod.is_active and not _is_datetime_expired(mod.expires_at):
                if mod.can_manage_all_playlists:
                    return ModeratorPlaylistAccessInfo(
                        playlist_id=playlist_id,
                        user_id=user_id,
                        access_level="moderator",
                        name=mod.name,
                        can_manage_tracks=True,
                        can_manage_settings=True,
                    )
                access = await self.access_repo.get_by_mod_and_playlist(db_session, mod.id, playlist_id)
                if access:
                    return ModeratorPlaylistAccessInfo(
                        playlist_id=playlist_id,
                        user_id=user_id,
                        access_level="moderator",
                        name=mod.name,
                        can_manage_tracks=access.can_manage_tracks,
                        can_manage_settings=access.can_manage_settings,
                    )

        # Moderator by token
        if token:
            mod = await self.mod_repo.get_by_token(db_session, token)
            if mod and mod.owner_id == plst.owner_id and mod.is_active and not _is_datetime_expired(mod.expires_at):
                if mod.can_manage_all_playlists:
                    return ModeratorPlaylistAccessInfo(
                        playlist_id=playlist_id,
                        user_id=mod.user_id,
                        access_level="moderator",
                        name=mod.name,
                        can_manage_tracks=True,
                        can_manage_settings=True,
                    )
                access = await self.access_repo.get_by_mod_and_playlist(db_session, mod.id, playlist_id)
                if access:
                    return ModeratorPlaylistAccessInfo(
                        playlist_id=playlist_id,
                        user_id=mod.user_id,
                        access_level="moderator",
                        name=mod.name,
                        can_manage_tracks=access.can_manage_tracks,
                        can_manage_settings=access.can_manage_settings,
                    )

        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to playlist")


moderator_service = ModeratorService()


def get_moderator_service() -> ModeratorService:
    return moderator_service
