from sqladmin import ModelView
from sqladmin.filters import BooleanFilter

from src.orm.moderator import ChannelModerator, ModeratorPlaylistAccess


class ChannelModeratorAdmin(ModelView, model=ChannelModerator):
    name = "Channel Moderator"
    name_plural = "Channel Moderators"
    icon = "fa-solid fa-user-shield"

    column_list = [
        ChannelModerator.id,
        ChannelModerator.owner_id,
        ChannelModerator.user_id,
        ChannelModerator.name,
        ChannelModerator.can_control_player,
        ChannelModerator.can_manage_all_playlists,
        ChannelModerator.is_active,
        ChannelModerator.expires_at,
        ChannelModerator.created_at,
    ]
    column_searchable_list = [
        ChannelModerator.name,
        ChannelModerator.token,
        ChannelModerator.owner_id,
        ChannelModerator.user_id,
    ]
    column_filters = [
        BooleanFilter(ChannelModerator.is_active),
        BooleanFilter(ChannelModerator.can_control_player),
        BooleanFilter(ChannelModerator.can_manage_all_playlists),
    ]
    form_excluded_columns = [
        ChannelModerator.created_at,
        ChannelModerator.updated_at,
        ChannelModerator.owner,
        ChannelModerator.user,
        ChannelModerator.playlist_access,
    ]


class ModeratorPlaylistAccessAdmin(ModelView, model=ModeratorPlaylistAccess):
    name = "Moderator Playlist Access"
    name_plural = "Moderator Playlist Accesses"
    icon = "fa-solid fa-lock-open"

    column_list = [
        ModeratorPlaylistAccess.id,
        ModeratorPlaylistAccess.moderator_id,
        ModeratorPlaylistAccess.playlist_id,
        ModeratorPlaylistAccess.can_manage_tracks,
        ModeratorPlaylistAccess.can_manage_settings,
        ModeratorPlaylistAccess.created_at,
    ]
    column_filters = [
        BooleanFilter(ModeratorPlaylistAccess.can_manage_tracks),
        BooleanFilter(ModeratorPlaylistAccess.can_manage_settings),
    ]
    form_excluded_columns = [
        ModeratorPlaylistAccess.created_at,
        ModeratorPlaylistAccess.updated_at,
        ModeratorPlaylistAccess.moderator,
        ModeratorPlaylistAccess.playlist,
    ]
