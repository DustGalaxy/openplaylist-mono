from dataclasses import dataclass

from _types import IManager


@dataclass
class Context:
    manager: IManager | None = None


context = Context()
