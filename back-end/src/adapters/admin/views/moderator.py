from sqladmin import ModelView
from sqladmin.filters import BooleanFilter

from src.orm.moderator import PlaylistModerator


class PlaylistModeratorAdmin(ModelView, model=PlaylistModerator):
    name = "Playlist Moderator"
    name_plural = "Playlist Moderators"
    icon = "fa-solid fa-user-shield"

    column_list = [
        PlaylistModerator.id,
        PlaylistModerator.playlist_id,
        PlaylistModerator.user_id,
        PlaylistModerator.name,
        PlaylistModerator.is_active,
        PlaylistModerator.expires_at,
        PlaylistModerator.created_at,
    ]
    column_searchable_list = [
        PlaylistModerator.name,
        PlaylistModerator.token,
        PlaylistModerator.playlist_id,
        PlaylistModerator.user_id,
    ]
    column_filters = [
        BooleanFilter(PlaylistModerator.is_active),
    ]
    form_excluded_columns = [
        PlaylistModerator.created_at,
        PlaylistModerator.updated_at,
        PlaylistModerator.playlist,
        PlaylistModerator.user,
    ]

