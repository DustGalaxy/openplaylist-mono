import secrets
from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, status
from simple_repository.exceptions import NotFoundException
from sqlalchemy.ext.asyncio import AsyncSession

from src.dal.postgres.moderator import ModeratorRepository, moderator_repository
from src.dal.postgres.playlist import PlaylistRepository, playlist_repository
from src.dal.postgres.user import user_repository
from src.dto.moderator import (
    CreateModeratorTokenRequest,
    DirectAddModeratorRequest,
    ModeratorAccessInfo,
    ModeratorItemResponse,
    UpdateModeratorRequest,
    UserModeratedPlaylistResponse,
)
from src.dto.playlist import ReadPlaylistPreview
from src.models.moderator import ModeratorCreate, ModeratorPatch


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
        mod_repo: ModeratorRepository = moderator_repository,
        plst_repo: PlaylistRepository = playlist_repository,
    ):
        self.mod_repo = mod_repo
        self.plst_repo = plst_repo

    async def _verify_owner(self, db_session: AsyncSession, playlist_id: UUID, user_id: UUID):
        try:
            plst = await self.plst_repo.get_one(db_session, playlist_id)
            if plst.owner_id != user_id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not the owner of this playlist")
            return plst
        except NotFoundException:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Playlist not found")

    async def create_moderator_token(
        self,
        db_session: AsyncSession,
        playlist_id: UUID,
        owner_id: UUID,
        data: CreateModeratorTokenRequest,
    ) -> ModeratorItemResponse:
        await self._verify_owner(db_session, playlist_id, owner_id)

        raw_token = f"mod_{secrets.token_urlsafe(32)}"
        permissions_dict = data.permissions.model_dump()

        new_mod = ModeratorCreate(
            playlist_id=playlist_id,
            name=data.name,
            token=raw_token,
            permissions=permissions_dict,
            expires_at=_normalize_naive_datetime(data.expires_at),
            is_active=True,
        )

        created = await self.mod_repo.create(db_session, new_mod)
        return ModeratorItemResponse.model_validate(created)

    async def add_moderator_by_user_id(
        self,
        db_session: AsyncSession,
        playlist_id: UUID,
        owner_id: UUID,
        data: DirectAddModeratorRequest,
    ) -> ModeratorItemResponse:
        await self._verify_owner(db_session, playlist_id, owner_id)

        if data.target_user_id == owner_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Playlist owner cannot be added as a moderator")

        try:
            await user_repository.get_one(db_session, data.target_user_id)
        except NotFoundException:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target user not found")

        existing = await self.mod_repo.get_by_playlist_and_user(db_session, playlist_id, data.target_user_id)
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is already a moderator for this playlist")

        raw_token = f"mod_{secrets.token_urlsafe(32)}"
        permissions_dict = data.permissions.model_dump()

        new_mod = ModeratorCreate(
            playlist_id=playlist_id,
            user_id=data.target_user_id,
            name=data.name,
            token=raw_token,
            permissions=permissions_dict,
            expires_at=_normalize_naive_datetime(data.expires_at),
            is_active=True,
        )

        created = await self.mod_repo.create(db_session, new_mod)
        return ModeratorItemResponse.model_validate(created)

    async def patch_moderator(
        self,
        db_session: AsyncSession,
        playlist_id: UUID,
        moderator_id: UUID,
        owner_id: UUID,
        data: UpdateModeratorRequest,
    ) -> ModeratorItemResponse:
        await self._verify_owner(db_session, playlist_id, owner_id)
        try:
            mod = await self.mod_repo.get_one(db_session, moderator_id)
            if mod.playlist_id != playlist_id:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Moderator not found")

            patch_data = ModeratorPatch(
                name=data.name,
                permissions=data.permissions.model_dump() if data.permissions else None,
                expires_at=_normalize_naive_datetime(data.expires_at) if data.expires_at is not None else None,
                is_active=data.is_active,
            )
            updated = await self.mod_repo.patch(db_session, patch_data, moderator_id)
            return ModeratorItemResponse.model_validate(updated)
        except NotFoundException:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Moderator not found")

    async def claim_moderator_token(
        self,
        db_session: AsyncSession,
        playlist_id: UUID,
        current_user_id: UUID,
        token: str,
    ) -> ModeratorItemResponse:
        try:
            plst = await self.plst_repo.get_one(db_session, playlist_id)
        except NotFoundException:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Playlist not found")

        if plst.owner_id == current_user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Playlist owner cannot claim a moderator token for their own playlist",
            )

        mod = await self.mod_repo.get_by_token(db_session, token)
        if not mod or mod.playlist_id != playlist_id or not mod.is_active:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or inactive moderator token")

        if _is_datetime_expired(mod.expires_at):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Moderator token has expired")

        if mod.user_id is not None:
            if mod.user_id == current_user_id:
                return ModeratorItemResponse.model_validate(mod)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This moderator token has already been claimed by another user",
            )

        patch_data = ModeratorPatch(user_id=current_user_id)
        updated = await self.mod_repo.patch(db_session, patch_data, mod.id)
        return ModeratorItemResponse.model_validate(updated)

    async def leave_moderator(
        self,
        db_session: AsyncSession,
        playlist_id: UUID,
        current_user_id: UUID,
    ) -> None:
        mod = await self.mod_repo.get_by_playlist_and_user(db_session, playlist_id, current_user_id)
        if not mod:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="You are not a moderator of this playlist")
        await self.mod_repo.remove(db_session, mod.id)

    async def list_moderators(
        self,
        db_session: AsyncSession,
        playlist_id: UUID,
        owner_id: UUID,
    ) -> list[ModeratorItemResponse]:
        await self._verify_owner(db_session, playlist_id, owner_id)
        mods = await self.mod_repo.get_all_by_playlist(db_session, playlist_id)
        return [ModeratorItemResponse.model_validate(m) for m in mods]

    async def revoke_moderator(
        self,
        db_session: AsyncSession,
        playlist_id: UUID,
        moderator_id: UUID,
        owner_id: UUID,
    ) -> None:
        await self._verify_owner(db_session, playlist_id, owner_id)
        try:
            mod = await self.mod_repo.get_one(db_session, moderator_id)
            if mod.playlist_id != playlist_id:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Moderator not found")
            await self.mod_repo.remove(db_session, moderator_id)
        except NotFoundException:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Moderator not found")

    async def get_access_info(
        self,
        db_session: AsyncSession,
        playlist_id: UUID,
        user_id: UUID | None = None,
        token: str | None = None,
    ) -> ModeratorAccessInfo:
        # Check if user is owner
        if user_id:
            try:
                plst = await self.plst_repo.get_one(db_session, playlist_id)
                if plst.owner_id == user_id:
                    owner_name = "Playlist Owner"
                    try:
                        owner_user = await user_repository.get_one(db_session, user_id)
                        if owner_user and hasattr(owner_user, "username"):
                            owner_name = str(owner_user.username)
                    except Exception:
                        pass
                    return ModeratorAccessInfo(
                        playlist_id=playlist_id,
                        user_id=user_id,
                        access_level="owner",
                        name=owner_name,
                        permissions={
                            "can_manage_queue": True,
                            "can_manage_playback": True,
                            "can_manage_settings": True,
                        },
                    )
            except NotFoundException:
                pass

        # Check by user_id as registered moderator
        if user_id:
            mod = await self.mod_repo.get_by_playlist_and_user(db_session, playlist_id, user_id)
            if mod and mod.is_active:
                if _is_datetime_expired(mod.expires_at):
                    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Moderator token expired")
                return ModeratorAccessInfo(
                    playlist_id=playlist_id,
                    user_id=user_id,
                    access_level="moderator",
                    name=mod.name,
                    permissions=mod.permissions
                    or {
                        "can_manage_queue": True,
                        "can_manage_playback": True,
                        "can_manage_settings": False,
                    },
                )

        # Check by token (query param or header)
        if token:
            mod = await self.mod_repo.get_by_token(db_session, token)
            if mod and mod.playlist_id == playlist_id and mod.is_active:
                if mod.user_id is not None:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Token has already been claimed by a user. Please log in as the account holder",
                    )
                if _is_datetime_expired(mod.expires_at):
                    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Moderator token expired")
                return ModeratorAccessInfo(
                    playlist_id=playlist_id,
                    user_id=mod.user_id,
                    access_level="moderator",
                    name=mod.name,
                    permissions=mod.permissions
                    or {
                        "can_manage_queue": True,
                        "can_manage_playback": True,
                        "can_manage_settings": False,
                    },
                )

        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    async def get_user_moderated_playlists(
        self,
        db_session: AsyncSession,
        user_id: UUID,
    ) -> list[UserModeratedPlaylistResponse]:
        mods = await self.mod_repo.get_all_by_user(db_session, user_id)
        result = []
        for mod in mods:
            if not mod.playlist:
                continue
            if _is_datetime_expired(mod.expires_at):
                continue

            preview = ReadPlaylistPreview(
                id=mod.playlist.id,
                owner_nickname=mod.playlist.owner_nickname,
                name=mod.playlist.name,
                description=mod.playlist.description,
                favorites_count=mod.playlist.favorites_count,
                created_at=mod.playlist.created_at,
                updated_at=mod.playlist.updated_at,
            )
            result.append(
                UserModeratedPlaylistResponse(
                    moderator_id=mod.id,
                    playlist=preview,
                    permissions=mod.permissions or {},
                    expires_at=mod.expires_at,
                )
            )
        return result


moderator_service = ModeratorService()


def get_moderator_service() -> ModeratorService:
    return moderator_service
