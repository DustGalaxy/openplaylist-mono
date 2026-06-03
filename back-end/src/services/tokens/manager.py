from src.dto.internal.token import TokenStrategy

from src.services.auth.twitch_service import auth_twitch_service
from src.services.auth.da_service import auth_da_service


class TokenStrategyManager:
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

    def add_strategy(self, mark: str, strategy: TokenStrategy):
        self._registry[mark] = strategy

    def get_strategy(self, obj: str) -> TokenStrategy:
        strategy = self._registry.get(obj)
        if strategy is None:
            raise NotImplementedError(f"Strategy for {obj} is not implemented")
        return strategy


manager = TokenStrategyManager()
manager.add_strategy("twitch", auth_twitch_service)
manager.add_strategy("da", auth_da_service)
