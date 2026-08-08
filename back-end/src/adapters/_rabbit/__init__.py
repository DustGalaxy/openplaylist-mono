from src.adapters._rabbit.broker import broker

# Только потом импортируем хэндлеры, которые используют этот брокер
from src.adapters._rabbit.bots import da, twitch, donatex

__all__ = ("broker",)
