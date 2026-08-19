from dataclasses import dataclass
from typing import Any


@dataclass
class Context:
    manager: Any = None


context = Context()
