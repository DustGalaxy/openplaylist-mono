from dataclasses import dataclass

from src._types import IManager


@dataclass
class Context:
    manager: IManager | None = None


context = Context()
