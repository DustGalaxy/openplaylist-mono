import json
import re
from typing import Any

import requests
from pytubefix import YouTube

from src.dal._redis.broker import get_broker
from src.dto.youtube import VideoInfo
from src.exceptions import InvalidYouTubeUrl, NotEmbeddable
from src.settings import settings
from src.utils import parse_ISO_8601


class YouTubeService:
    BASE_YOUTUBE_API_URL = "https://www.googleapis.com/youtube/v3"

    def get_data_from_pytube(self, url: str, video_id: str | None = None) -> VideoInfo:
        video_url = url if "http" in url else f"https://www.youtube.com/watch?v={video_id}"
        yt = YouTube(video_url, "ANDROID")

        try:
            first_part = yt.initial_data["contents"]["twoColumnWatchNextResults"]["results"]["results"]["contents"][0]
            second_part = first_part.get("videoPrimaryInfoRenderer") or first_part.get("videoSecondaryInfoRenderer")

            likes = second_part["videoActions"]["menuRenderer"]["topLevelButtons"][0]["segmentedLikeDislikeButtonViewModel"][
                "likeButtonViewModel"
            ]["likeButtonViewModel"]["toggleButtonViewModel"]["toggleButtonViewModel"]["defaultButtonViewModel"][
                "buttonViewModel"
            ]["accessibilityText"]

            likes_text = likes
            like_template = r"like this video along with (.*?) other people"
            text = str(likes_text)
            matches = re.findall(like_template, text, re.MULTILINE)
            likes = None
            if len(matches) >= 1:
                like_str: str = matches[0]
                likes = int(like_str.replace(",", ""))
        except Exception:
            likes = None

        vid_id = video_id or yt.video_id

        return {
            "title": yt.title if yt.title else "Unknown",
            "author": yt.author if yt.author else "Unknown",
            "embeddable": bool(yt.embed_html),
            "length": yt.length if yt.length else 0,
            "likes": likes if likes else 0,
            "views": yt.views if yt.views else 0,
            "yt_video_id": vid_id,
        }

    def get_data_from_youtube_api(self, video_id: str, api_key: str) -> VideoInfo:
        url = f"{self.BASE_YOUTUBE_API_URL}/videos"
        params = {
            "part": "snippet,statistics,status,contentDetails",
            "id": video_id,
            "key": api_key,
        }

        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        json_data = response.json()

        if not json_data.get("items"):
            raise InvalidYouTubeUrl("Invalid YouTube video URL")

        video_item = json_data["items"][0]

        return {
            "title": video_item["snippet"]["title"],
            "author": video_item["snippet"]["channelTitle"],
            "embeddable": video_item["status"]["embeddable"],
            "views": int(video_item["statistics"].get("viewCount", 0)),
            "likes": int(video_item["statistics"].get("likeCount", 0)),
            "length": parse_ISO_8601(video_item["contentDetails"]["duration"]),
            "yt_video_id": video_id,
        }

    def get_from_cache(self, video_id: str) -> VideoInfo | None:
        data = get_broker().get(video_id)
        if data is not None and str(data) != "None":
            return json.loads(str(data))
        return None

    def save_to_cache(self, video_id: str, data: VideoInfo):
        get_broker().set(video_id, json.dumps(data), ex=60 * 60 * 24 * 3)

    def get_video_info(self, video_id: str, raw_url: str | None = None) -> VideoInfo:
        data: VideoInfo | None = self.get_from_cache(video_id)

        if not data:
            if settings.YOUTUBE_API_KEY:
                try:
                    data = self.get_data_from_youtube_api(video_id, settings.YOUTUBE_API_KEY)
                    if not data["embeddable"]:
                        raise NotEmbeddable()
                except (requests.HTTPError, ValueError):
                    data = self.get_data_from_pytube(raw_url or f"https://www.youtube.com/watch?v={video_id}", video_id)
            else:
                data = self.get_data_from_pytube(raw_url or f"https://www.youtube.com/watch?v={video_id}", video_id)

            self.save_to_cache(video_id, data)

        return data

    def get_playlist_tracks(self, playlist_id: str, start_video_id: str | None = None, limit: int = 50) -> list[VideoInfo]:
        if not settings.YOUTUBE_API_KEY:
            raise ValueError("YOUTUBE_API_KEY is required for playlist imports")

        playlist_items_url = f"{self.BASE_YOUTUBE_API_URL}/playlistItems"
        params: dict[str, Any] = {
            "part": "snippet",
            "playlistId": playlist_id,
            "maxResults": min(limit, 50),
            "key": settings.YOUTUBE_API_KEY,
        }

        response = requests.get(playlist_items_url, params=params, timeout=10)
        response.raise_for_status()
        json_data = response.json()

        items = json_data.get("items", [])
        if not items:
            return []

        video_ids: list[str] = []
        for item in items:
            vid = item.get("snippet", {}).get("resourceId", {}).get("videoId")
            if vid:
                video_ids.append(vid)

        if start_video_id and start_video_id in video_ids:
            start_index = video_ids.index(start_video_id)
            video_ids = video_ids[start_index:]

        video_ids = video_ids[:limit]
        if not video_ids:
            return []

        # Batch fetch details for up to 50 videos in 1 API call
        videos_url = f"{self.BASE_YOUTUBE_API_URL}/videos"
        batch_params = {
            "part": "snippet,statistics,status,contentDetails",
            "id": ",".join(video_ids),
            "key": settings.YOUTUBE_API_KEY,
        }

        batch_resp = requests.get(videos_url, params=batch_params, timeout=10)
        batch_resp.raise_for_status()
        batch_json = batch_resp.json()

        video_items_map: dict[str, dict] = {item["id"]: item for item in batch_json.get("items", [])}

        results: list[VideoInfo] = []
        for vid in video_ids:
            v_item = video_items_map.get(vid)
            if not v_item:
                continue

            info: VideoInfo = {
                "title": v_item["snippet"]["title"],
                "author": v_item["snippet"]["channelTitle"],
                "embeddable": v_item["status"]["embeddable"],
                "views": int(v_item["statistics"].get("viewCount", 0)),
                "likes": int(v_item["statistics"].get("likeCount", 0)),
                "length": parse_ISO_8601(v_item["contentDetails"]["duration"]),
                "yt_video_id": vid,
            }
            self.save_to_cache(vid, info)
            results.append(info)

        return results


youtube_service = YouTubeService()
