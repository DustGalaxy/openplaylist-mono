from src.dto.internal.auth import IntegrationPlatform, RefreshTokenStrategy
from src.services.auth.da_service import AuthDAService
from src.services.auth.donatex_service import AuthDonateXService
from src.services.auth.google_service import AuthGoogleService
from src.services.auth.twitch_service import AuthTwitchService


class TokenStrategyManager:
    def __init__(self):
        self._registry = {}

    def register(self, mark: IntegrationPlatform, **kwargs):
        """
        Registers a strategy class with the given mark.
        This method returns a decorator that instantiates the strategy class
        with the provided keyword arguments and stores the instance in the
        registry under the specified mark.
        Args:
            mark (str): The key to register the strategy instance under.
            **kwargs: Keyword arguments to pass to the strategy class constructor.
        Returns:
            callable: A decorator function that takes a strategy class and returns it
            after registering an instance of it.
        """

        def wrapper(strategy_class):
            instance = strategy_class(**kwargs)
            self._registry[mark] = instance
            return strategy_class

        return wrapper

    def add_strategy(self, mark: IntegrationPlatform, strategy: RefreshTokenStrategy):
        self._registry[mark] = strategy

    def get_strategy(self, obj: IntegrationPlatform) -> RefreshTokenStrategy:
        strategy = self._registry.get(obj)
        if strategy is None:
            raise NotImplementedError(f"Strategy for {obj} is not implemented")
        return strategy


manager = TokenStrategyManager()
manager.add_strategy(IntegrationPlatform.TWITCH, AuthTwitchService())
manager.add_strategy(IntegrationPlatform.DA, AuthDAService())
manager.add_strategy(IntegrationPlatform.GOOGLE, AuthGoogleService())
manager.add_strategy(IntegrationPlatform.DONATEX, AuthDonateXService())
