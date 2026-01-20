from fastapi import HTTPException


class NotAuthorizedException(HTTPException):
    def __init__(self):
        super().__init__(status_code=401, detail="Not authorized")


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
