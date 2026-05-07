from dto.internal.auth import AuthStrategy

from adapters._rabbit.event_broker import bot_twitch_connect_request, bot_da_connect_request
from services.auth.twitch_service import AuthTwitchService
from services.auth.da_service import AuthDAService


class AuthStrategyManager:
    def __init__(self):
        self._registry = {}

    def register(self, mark: str, **kwargs):
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

    def add_strategy(self, mark: str, strategy: AuthStrategy):
        self._registry[mark] = strategy

    def get_strategy(self, obj: str) -> AuthStrategy:
        strategy = self._registry.get(obj)
        if strategy is None:
            raise NotImplementedError(f"Strategy for {obj} is not implemented")
        return strategy


manager = AuthStrategyManager()
manager.add_strategy("twitch", AuthTwitchService(bot_twitch_connect_request))
manager.add_strategy("da", AuthDAService(bot_da_connect_request))
