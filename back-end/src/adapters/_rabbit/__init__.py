from .event_broker import broker, declare

# Только потом импортируем хэндлеры, которые используют этот брокер
from .handlers import da, twitch

__all__ = ("broker", "declare")