from sqladmin import ModelView
from sqladmin.filters import AllUniqueStringValuesFilter

from src.orm.token_vault import TokenVault


class TokenVaultAdmin(ModelView, model=TokenVault):
    name = "Token Vault"
    name_plural = "Token Vaults"
    icon = "fa-solid fa-key"

    column_list = [
        TokenVault.id,
        TokenVault.linked_account_id,
        TokenVault.token_type,
        TokenVault.expires_at,
        TokenVault.last_update,
        TokenVault.created_at,
    ]
    column_searchable_list = [
        TokenVault.id,
        TokenVault.linked_account_id,
        TokenVault.token_type,
    ]
    column_filters = [
        AllUniqueStringValuesFilter(TokenVault.token_type),
    ]
    column_details_exclude_list = [TokenVault.access_token, TokenVault.refresh_token]
    form_excluded_columns = [TokenVault.created_at, TokenVault.updated_at, TokenVault.last_update]
