from uuid import UUID, uuid4

from fastapi import APIRouter, HTTPException, Query, status

from src.adapters._fastapi.dependencies import (
    CURR_USER,
    DB_SESSION,
    MODERATOR_ACCESS,
    MODERATOR_SERVICE,
)
from src.adapters._rabbit.broker import main_publisher
from src.adapters._rabbit.queues import playlist_fanout_exchange
from src.dal.postgres.playlist import playlist_repository
from src.dal.postgres.user import user_repository
from src.dto.internal.domain_events import EventOperator, InternalPlaylistEvent, InternalPlaylistEventType
from src.dto.moderator import (
    CreateModeratorTokenRequest,
    DirectAddModeratorRequest,
    ModeratorAccessInfo,
    ModeratorItemResponse,
    UpdateModeratorRequest,
)

router = APIRouter(prefix="/playlist/{playlist_id}/moderators")


async def _publish_moderator_event(
    db_session: DB_SESSION,
    playlist_id: UUID,
    event_type: InternalPlaylistEventType,
    operator: EventOperator,
    error_list: list[str] | None = None,
) -> None:

    playlist = await playlist_repository.get_one(db_session, playlist_id)
    owner = await user_repository.get_one(db_session, playlist.owner_id)
    owner_name = owner.username if owner else "Owner"
    await main_publisher.publish(
        InternalPlaylistEvent(
            event_id=uuid4(),
            event_type=event_type,
            playlist_id=playlist.id,
            playlist_name=playlist.name,
            playlist_is_public=playlist.is_public,
            show_in_widget=playlist.show_in_widget,
            user_id=playlist.owner_id,
            user_name=owner_name,
            operator=operator,
            error_list=error_list,
        ),
        exchange=playlist_fanout_exchange,
    )


@router.post("/token", status_code=status.HTTP_201_CREATED)
async def create_moderator_token(
    db_session: DB_SESSION,
    playlist_id: UUID,
    current_user: CURR_USER,
    service: MODERATOR_SERVICE,
    data: CreateModeratorTokenRequest,
) -> ModeratorItemResponse:
    res = await service.create_moderator_token(
        db_session=db_session,
        playlist_id=playlist_id,
        owner_id=current_user.id,
        data=data,
    )
    await _publish_moderator_event(
        db_session=db_session,
        playlist_id=playlist_id,
        event_type=InternalPlaylistEventType.MODERATOR_TOKEN_CREATED,
        operator=EventOperator(user_id=current_user.id, nickname=current_user.username, access_level="owner"),
    )
    return res


@router.post("/user", status_code=status.HTTP_201_CREATED)
async def add_moderator_by_user_id(
    db_session: DB_SESSION,
    playlist_id: UUID,
    current_user: CURR_USER,
    service: MODERATOR_SERVICE,
    data: DirectAddModeratorRequest,
) -> ModeratorItemResponse:
    res = await service.add_moderator_by_user_id(
        db_session=db_session,
        playlist_id=playlist_id,
        owner_id=current_user.id,
        data=data,
    )
    await _publish_moderator_event(
        db_session=db_session,
        playlist_id=playlist_id,
        event_type=InternalPlaylistEventType.MODERATOR_ADDED_DIRECT,
        operator=EventOperator(user_id=current_user.id, nickname=current_user.username, access_level="owner"),
    )
    return res


@router.post("/claim", status_code=status.HTTP_200_OK)
async def claim_moderator_token(
    db_session: DB_SESSION,
    playlist_id: UUID,
    current_user: CURR_USER,
    service: MODERATOR_SERVICE,
    token: str = Query(...),
) -> ModeratorItemResponse:
    try:
        res = await service.claim_moderator_token(
            db_session=db_session,
            playlist_id=playlist_id,
            current_user_id=current_user.id,
            token=token,
        )
        await _publish_moderator_event(
            db_session=db_session,
            playlist_id=playlist_id,
            event_type=InternalPlaylistEventType.MODERATOR_CLAIMED,
            operator=EventOperator(user_id=current_user.id, nickname=current_user.username, access_level="moderator"),
        )
        return res
    except HTTPException as exc:
        await _publish_moderator_event(
            db_session=db_session,
            playlist_id=playlist_id,
            event_type=InternalPlaylistEventType.MODERATOR_CLAIM_FAILED,
            operator=EventOperator(user_id=current_user.id, nickname=current_user.username, access_level="none"),
            error_list=[str(exc.detail)],
        )
        raise exc


@router.patch("/{moderator_id}", status_code=status.HTTP_200_OK)
async def patch_moderator(
    db_session: DB_SESSION,
    playlist_id: UUID,
    moderator_id: UUID,
    current_user: CURR_USER,
    service: MODERATOR_SERVICE,
    data: UpdateModeratorRequest,
) -> ModeratorItemResponse:
    return await service.patch_moderator(
        db_session=db_session,
        playlist_id=playlist_id,
        moderator_id=moderator_id,
        owner_id=current_user.id,
        data=data,
    )


@router.delete("/leave", status_code=status.HTTP_204_NO_CONTENT)
async def leave_moderator(
    db_session: DB_SESSION,
    playlist_id: UUID,
    current_user: CURR_USER,
    service: MODERATOR_SERVICE,
) -> None:
    await service.leave_moderator(
        db_session=db_session,
        playlist_id=playlist_id,
        current_user_id=current_user.id,
    )
    await _publish_moderator_event(
        db_session=db_session,
        playlist_id=playlist_id,
        event_type=InternalPlaylistEventType.MODERATOR_LEFT,
        operator=EventOperator(user_id=current_user.id, nickname=current_user.username, access_level="moderator"),
    )


@router.get("", status_code=status.HTTP_200_OK)
async def list_moderators(
    db_session: DB_SESSION,
    playlist_id: UUID,
    current_user: CURR_USER,
    service: MODERATOR_SERVICE,
) -> list[ModeratorItemResponse]:
    return await service.list_moderators(
        db_session=db_session,
        playlist_id=playlist_id,
        owner_id=current_user.id,
    )


@router.delete("/{moderator_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_moderator(
    db_session: DB_SESSION,
    playlist_id: UUID,
    moderator_id: UUID,
    current_user: CURR_USER,
    service: MODERATOR_SERVICE,
) -> None:
    await service.revoke_moderator(
        db_session=db_session,
        playlist_id=playlist_id,
        moderator_id=moderator_id,
        owner_id=current_user.id,
    )
    await _publish_moderator_event(
        db_session=db_session,
        playlist_id=playlist_id,
        event_type=InternalPlaylistEventType.MODERATOR_REVOKED,
        operator=EventOperator(user_id=current_user.id, nickname=current_user.username, access_level="owner"),
    )


@router.get("/access", status_code=status.HTTP_200_OK)
async def get_moderator_access(
    access_info: MODERATOR_ACCESS,
) -> ModeratorAccessInfo:
    return access_info
