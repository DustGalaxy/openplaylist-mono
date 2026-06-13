from fastapi import HTTPException

from src.services.auth.twitch_service import AuthTwitchService
from src.services.auth.da_service import AuthDAService
from src.services.auth.google_service import AuthGoogleService
from src.services.auth.donatex_service import AuthDonateXService
from src.dto.internal.auth import IntegrationStrategy, PlatformCap
from src._types import IntegrationPlatform, IntegrationType


class AuthStrategyManager:
    def __init__(self):
        self._registry: dict[IntegrationPlatform, IntegrationStrategy] = {}

    def register(self, strategy: IntegrationStrategy) -> IntegrationStrategy:
        self._registry[strategy.meta.platform] = strategy
        return strategy

    def get(self, platform: IntegrationPlatform) -> IntegrationStrategy:
        strategy = self._registry.get(platform)
        if strategy is None:
            raise HTTPException(status_code=400, detail=f"Platform '{platform}' not supported")
        return strategy

    def supports_identity(self, platform: IntegrationPlatform) -> bool:
        strtg = self.get(platform)
        return strtg.meta.integration_type in (
            IntegrationType.IDENTITY_ONLY,
            IntegrationType.IDENTITY_AND_BOT,
        )

    def supports_bot(self, platform: IntegrationPlatform) -> bool:
        strtg = self.get(platform)
        return strtg.meta.integration_type in (
            IntegrationType.BOT_ONLY,
            IntegrationType.IDENTITY_AND_BOT,
        )

    def has_capability(self, platform: IntegrationPlatform, cap: PlatformCap) -> bool:
        return cap in self.get(platform).meta.bot_capabilities


manager = AuthStrategyManager()
manager.register(AuthTwitchService())
manager.register(AuthDAService())
manager.register(AuthGoogleService())
manager.register(AuthDonateXService())
