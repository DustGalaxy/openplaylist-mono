from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status

from src.adapters._fastapi.dependencies import CURR_USER, DB_SESSION
from src.dal.postgres.history import playback_history_repository
from src.models.playback_history import PlaybackHistoryListResponse

router = APIRouter(prefix="/history", tags=["history"])


@router.get("", response_model=PlaybackHistoryListResponse)
async def get_history(
    db_session: DB_SESSION,
    current_user: CURR_USER,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    search: str | None = Query(None),
):
    items, total = await playback_history_repository.get_user_history(
        session=db_session,
        user_id=current_user.id,
        limit=limit,
        offset=offset,
        search=search,
    )
    return PlaybackHistoryListResponse(
        items=items,
        total=total,
        limit=limit,
        offset=offset,
    )


@router.delete("/clear", status_code=status.HTTP_200_OK)
async def clear_history(
    db_session: DB_SESSION,
    current_user: CURR_USER,
):
    deleted_count = await playback_history_repository.clear_user_history(
        session=db_session,
        user_id=current_user.id,
    )
    return {"status": "cleared", "count": deleted_count}


@router.delete("/{history_id}", status_code=status.HTTP_200_OK)
async def delete_history_item(
    history_id: UUID,
    db_session: DB_SESSION,
    current_user: CURR_USER,
):
    success = await playback_history_repository.delete_user_entry(
        session=db_session,
        user_id=current_user.id,
        history_id=history_id,
    )
    if not success:
        raise HTTPException(status_code=404, detail="History entry not found")
    return {"status": "deleted", "history_id": str(history_id)}
