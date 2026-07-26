import uuid
import orjson

def dumps(obj, *args, **kwargs) -> str:
    # default для неизвестных типов, decode() для возврата str
    def _default(o):
        if isinstance(o, uuid.UUID):
            return str(o)
        if hasattr(o, "model_dump"):
            return o.model_dump()
        raise TypeError(f"Object of type {type(o).__name__} is not JSON serializable")

    return orjson.dumps(obj, default=_default).decode("utf-8")

def loads(s, *args, **kwargs):
    return orjson.loads(s)