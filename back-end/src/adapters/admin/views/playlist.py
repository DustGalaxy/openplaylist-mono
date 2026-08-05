from sqladmin import ModelView
from sqladmin.filters import AllUniqueStringValuesFilter, BooleanFilter

from src.orm.playlist import (
    BlockList,
    ChatRules,
    ContentSettings,
    DonationRules,
    Order,
    OrderPlaylistStatus,
    Playlist,
)


class PlaylistAdmin(ModelView, model=Playlist):
    name = "Playlist"
    name_plural = "Playlists"
    icon = "fa-solid fa-list"

    column_list = [
        Playlist.id,
        Playlist.owner_id,
        Playlist.owner_nickname,
        Playlist.name,
        Playlist.mode,
        Playlist.repeat_mode,
        Playlist.cost_mode,
        Playlist.is_public,
        Playlist.is_favorite,
        Playlist.show_in_widget,
        Playlist.is_allow_external_requests,
        Playlist.created_at,
    ]
    column_searchable_list = [
        Playlist.name,
        Playlist.owner_nickname,
        Playlist.owner_id,
    ]
    column_filters = [
        BooleanFilter(Playlist.is_public),
        BooleanFilter(Playlist.is_favorite),
        BooleanFilter(Playlist.show_in_widget),
        BooleanFilter(Playlist.is_allow_external_requests),
        AllUniqueStringValuesFilter(Playlist.mode),
        AllUniqueStringValuesFilter(Playlist.repeat_mode),
        AllUniqueStringValuesFilter(Playlist.cost_mode),
    ]
    form_excluded_columns = [
        Playlist.created_at,
        Playlist.updated_at,
        Playlist.content_settings,
        Playlist.chat_rules,
        Playlist.donation_rules,
        Playlist.block_list,
        Playlist.order_associations,
        Playlist.active_order_associations,
        Playlist.order_links,
        Playlist.track_data,
    ]


class OrderAdmin(ModelView, model=Order):
    name = "Order"
    name_plural = "Orders"
    icon = "fa-solid fa-compact-disc"

    column_list = [
        Order.id,
        Order.title,
        Order.requester_nickname,
        Order.owner_platform_id,
        Order.source,
        Order.priority,
        Order.duration,
        Order.from_owner,
        Order.created_at,
    ]
    column_searchable_list = [
        Order.title,
        Order.yt_video_id,
        Order.requester_nickname,
        Order.requester_id,
        Order.owner_platform_id,
    ]
    column_filters = [
        AllUniqueStringValuesFilter(Order.source),
        BooleanFilter(Order.from_owner),
    ]
    form_excluded_columns = [
        Order.created_at,
        Order.updated_at,
        Order.playlist_associations,
    ]


class OrderPlaylistStatusAdmin(ModelView, model=OrderPlaylistStatus):
    name = "Order Playlist Status"
    name_plural = "Order Playlist Statuses"
    icon = "fa-solid fa-list-ol"

    column_list = [
        OrderPlaylistStatus.order_id,
        OrderPlaylistStatus.playlist_id,
        OrderPlaylistStatus.status,
        OrderPlaylistStatus.created_at,
    ]
    column_searchable_list = [
        OrderPlaylistStatus.order_id,
        OrderPlaylistStatus.playlist_id,
    ]
    column_filters = [
        AllUniqueStringValuesFilter(OrderPlaylistStatus.status),
    ]
    form_excluded_columns = [
        OrderPlaylistStatus.created_at,
        OrderPlaylistStatus.updated_at,
        OrderPlaylistStatus.order,
        OrderPlaylistStatus.playlist,
    ]


class ContentSettingsAdmin(ModelView, model=ContentSettings):
    name = "Content Setting"
    name_plural = "Content Settings"
    icon = "fa-solid fa-sliders"

    column_list = [
        ContentSettings.id,
        ContentSettings.playlist_id,
        ContentSettings.platform,
        ContentSettings.min_views,
        ContentSettings.min_likes,
        ContentSettings.max_duration,
        ContentSettings.track_cooldown,
        ContentSettings.user_cooldown,
        ContentSettings.created_at,
    ]
    column_searchable_list = [
        ContentSettings.playlist_id,
    ]
    column_filters = [
        AllUniqueStringValuesFilter(ContentSettings.platform),
    ]
    form_excluded_columns = [
        ContentSettings.created_at,
        ContentSettings.updated_at,
        ContentSettings.playlist,
    ]


class BlockListAdmin(ModelView, model=BlockList):
    name = "Block List"
    name_plural = "Block Lists"
    icon = "fa-solid fa-ban"

    column_list = [
        BlockList.id,
        BlockList.playlist_id,
        BlockList.trigger_type,
        BlockList.trigger_value,
        BlockList.platform,
        BlockList.created_at,
    ]
    column_searchable_list = [
        BlockList.playlist_id,
        BlockList.trigger_value,
    ]
    column_filters = [
        AllUniqueStringValuesFilter(BlockList.platform),
        AllUniqueStringValuesFilter(BlockList.trigger_type),
    ]
    form_excluded_columns = [
        BlockList.created_at,
        BlockList.updated_at,
        BlockList.playlist,
    ]


class DonationRulesAdmin(ModelView, model=DonationRules):
    name = "Donation Rule"
    name_plural = "Donation Rules"
    icon = "fa-solid fa-hand-holding-dollar"

    column_list = [
        DonationRules.id,
        DonationRules.playlist_id,
        DonationRules.name,
        DonationRules.platform,
        DonationRules.currency,
        DonationRules.amount,
        DonationRules.priority,
        DonationRules.created_at,
    ]
    column_searchable_list = [
        DonationRules.playlist_id,
        DonationRules.name,
    ]
    column_filters = [
        AllUniqueStringValuesFilter(DonationRules.platform),
        AllUniqueStringValuesFilter(DonationRules.currency),
    ]
    form_excluded_columns = [
        DonationRules.created_at,
        DonationRules.updated_at,
        DonationRules.playlist,
    ]


class ChatRulesAdmin(ModelView, model=ChatRules):
    name = "Chat Rule"
    name_plural = "Chat Rules"
    icon = "fa-solid fa-comments"

    column_list = [
        ChatRules.id,
        ChatRules.playlist_id,
        ChatRules.platform,
        ChatRules.key,
        ChatRules.priority,
        ChatRules.overrive_order,
        ChatRules.created_at,
    ]
    column_searchable_list = [
        ChatRules.playlist_id,
        ChatRules.key,
    ]
    column_filters = [
        AllUniqueStringValuesFilter(ChatRules.platform),
    ]
    form_excluded_columns = [
        ChatRules.created_at,
        ChatRules.updated_at,
        ChatRules.playlist,
    ]
