# Только потом импортируем хэндлеры, которые используют этот брокер
from src.adapters._rabbit.bots import da, donatex, twitch
from src.adapters._rabbit.broker import broker

__all__ = ("broker",)
