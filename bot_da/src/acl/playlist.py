import json

from adapters._rabbit.broker import rabbit_broker, main_exchange, playlist_settings_request

from dto.settings import ReadPlaylistSettings


class PlaylistACL:
    @staticmethod
    async def fetch_playlist_settings(user_id, playlist_name):
        plst_setting = await rabbit_broker.request(
            json.dumps({"user_id": user_id, "playlist_name": playlist_name}),
            playlist_settings_request,
            exchange=main_exchange,
        )

        return ReadPlaylistSettings.model_validate_json(plst_setting.body)
