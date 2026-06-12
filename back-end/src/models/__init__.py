from .token_vault import TokenVaultDomain
from .linked_accounts import LinkedAccountsDomain


def model_rebuild():
    TokenVaultDomain.model_rebuild()
