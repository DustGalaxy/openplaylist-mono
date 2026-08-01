import json

from src.adapters._rabbit.broker import broker, main_exchange, playlist_settings_request
from src.adapters._rabbit.dto.settings import ReadPlaylistSettings


class PlaylistACL:
    @staticmethod
    async def fetch_playlist_settings(user_id: str, playlist_name: str):
        plst_setting = await broker.request(
            json.dumps({"user_id": user_id, "playlist_name": playlist_name}),
            playlist_settings_request,
            exchange=main_exchange,
        )

        return ReadPlaylistSettings.model_validate_json(plst_setting.body)
