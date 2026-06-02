from fastapi import HTTPException


class NotEmbeddable(Exception):
    def __init__(self):
        super().__init__("Video is not embeddable")

class NotAuthorizedException(HTTPException):
    def __init__(self):
        super().__init__(status_code=401, detail="Not authorized")


class NeedConfirmationException(Exception):
    def __init__(self, data: dict, detail: str = "Need confirmation"):
        self.data = data
        super().__init__(detail)


class BadRequestException(HTTPException):
    def __init__(self):
        super().__init__(status_code=400, detail="Bad request")


class TrackAddException(Exception):
    pass


class UserCooldownException(TrackAddException):
    pass


class TrackCooldownException(TrackAddException):
    pass


class PlaylistIsFullException(TrackAddException):
    pass


class WrongCurrencyAmount(TrackAddException):
    pass


class TooLong(TrackAddException):
    pass


class BlackListTrack(TrackAddException):
    pass


class NotEnoughLikes(TrackAddException):
    pass


class NotEnoughViews(TrackAddException):
    pass


class NotActivePlaylist(TrackAddException):
    pass


class BlackListUser(TrackAddException):
    pass
