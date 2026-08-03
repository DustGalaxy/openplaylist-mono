from sqladmin import ModelView
from sqladmin.filters import AllUniqueStringValuesFilter, BooleanFilter

from src.orm.linked_accounts import LinkedAccounts


class LinkedAccountsAdmin(ModelView, model=LinkedAccounts):
    name = "Linked Account"
    name_plural = "Linked Accounts"
    icon = "fa-solid fa-link"

    column_list = [
        LinkedAccounts.id,
        LinkedAccounts.user_id,
        LinkedAccounts.platform,
        LinkedAccounts.platform_username,
        LinkedAccounts.platform_user_id,
        LinkedAccounts.bot_connection,
        LinkedAccounts.is_dead,
        LinkedAccounts.created_at,
    ]
    column_searchable_list = [
        LinkedAccounts.platform_username,
        LinkedAccounts.platform_user_id,
        LinkedAccounts.user_id,
    ]
    column_filters = [
        AllUniqueStringValuesFilter(LinkedAccounts.platform),
        BooleanFilter(LinkedAccounts.bot_connection),
        BooleanFilter(LinkedAccounts.is_dead),
    ]
    form_excluded_columns = [LinkedAccounts.created_at, LinkedAccounts.updated_at]
