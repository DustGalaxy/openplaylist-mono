from sqladmin import ModelView
from sqladmin.filters import BooleanFilter, OperationColumnFilter

from src.orm.auth_user import Banlist, User, UserRole


class UserAdmin(ModelView, model=User):
    name = "User"
    name_plural = "Users"
    icon = "fa-solid fa-user"

    column_list = [
        User.id,
        User.username,
        User.email,
        User.email_confirmed,
        User.is_active,
        User.is_public,
        User.last_login,
        User.created_at,
    ]
    column_searchable_list = [User.username, User.email]
    column_filters = [
        BooleanFilter(User.is_active),
        BooleanFilter(User.is_public),
        BooleanFilter(User.email_confirmed),
    ]
    column_details_exclude_list = [User.password]
    form_excluded_columns = [User.password, User.created_at, User.updated_at]


class UserRoleAdmin(ModelView, model=UserRole):
    name = "User Role"
    name_plural = "User Roles"
    icon = "fa-solid fa-user-shield"

    column_list = [
        UserRole.id,
        UserRole.user_id,
        UserRole.tier,
        UserRole.is_active,
        UserRole.start_date,
        UserRole.expires_at,
    ]
    column_searchable_list = [UserRole.id, UserRole.user_id]
    column_filters = [
        OperationColumnFilter(UserRole.tier),
        BooleanFilter(UserRole.is_active),
    ]


class BanlistAdmin(ModelView, model=Banlist):
    name = "Ban"
    name_plural = "Banlist"
    icon = "fa-solid fa-ban"

    column_list = [
        Banlist.id,
        Banlist.user_id,
        Banlist.reason,
        Banlist.expires_at,
        Banlist.created_at,
    ]
    column_searchable_list = [Banlist.reason, Banlist.user_id]
    form_excluded_columns = [Banlist.created_at, Banlist.updated_at]
