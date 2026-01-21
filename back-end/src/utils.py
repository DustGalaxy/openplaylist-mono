from typing import Callable

from taskiq.kicker import AsyncKicker


def find[T](list_to_search: list[T], condition_func: Callable[[T], bool]) -> T | None:
    return next((item for item in list_to_search if condition_func(item)), None)


def kick(task_name: str, broker, *args, labels=None, **kwargs):
    if labels is None:
        labels = {}
    kicker = AsyncKicker(task_name, broker, labels=labels)
    return kicker.kiq(*args, **kwargs)
