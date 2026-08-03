from .token_vault import TokenVaultDomain
from .linked_accounts import LinkedAccountsDomain
from .auth_user import AuthUserSchema
from .twitch_admin_token import (
    TwitchAdminTokenDomain,
    TwitchAdminTokenCreate,
    TwitchAdminTokenUpdate,
)


def model_rebuild():
    # Передаем локальное окружение, чтобы Pydantic "увидел" связанные модели
    LinkedAccountsDomain.model_rebuild(_types_namespace={"TokenVaultDomain": TokenVaultDomain})
    TokenVaultDomain.model_rebuild(_types_namespace={"LinkedAccountsDomain": LinkedAccountsDomain})

    AuthUserSchema.model_rebuild(_types_namespace={"LinkedAccountsDomain": LinkedAccountsDomain})


model_rebuild()
