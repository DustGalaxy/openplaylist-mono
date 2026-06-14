from src.adapters._rabbit.event_broker import broker, declare

# Только потом импортируем хэндлеры, которые используют этот брокер
from src.adapters._rabbit.handlers import da, twitch, donatex

__all__ = ("broker", "declare")