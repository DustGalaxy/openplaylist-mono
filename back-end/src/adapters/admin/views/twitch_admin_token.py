from sqladmin import ModelView
from sqladmin.filters import BooleanFilter

from src.orm.twitch_admin_token import TwitchAdminToken


class TwitchAdminTokenAdmin(ModelView, model=TwitchAdminToken):
    name = "Twitch Admin Token"
    name_plural = "Twitch Admin Tokens"
    icon = "fa-brands fa-twitch"

    column_list = [
        TwitchAdminToken.id,
        TwitchAdminToken.twitch_username,
        TwitchAdminToken.twitch_user_id,
        TwitchAdminToken.twitch_email,
        TwitchAdminToken.token_type,
        TwitchAdminToken.is_active,
        TwitchAdminToken.expires_at,
        TwitchAdminToken.created_at,
    ]
    column_searchable_list = [
        TwitchAdminToken.twitch_username,
        TwitchAdminToken.twitch_user_id,
        TwitchAdminToken.twitch_email,
    ]
    column_filters = [
        BooleanFilter(TwitchAdminToken.is_active),
    ]
    column_details_exclude_list = [TwitchAdminToken.access_token, TwitchAdminToken.refresh_token]
    form_excluded_columns = [TwitchAdminToken.created_at, TwitchAdminToken.updated_at]
