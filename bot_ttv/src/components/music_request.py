from typing import Literal

from twitchio import Chatter
from twitchio.ext import commands

from src.acl.playlist import PlaylistACL
from src.adapters._rabbit.dto.settings import ReadPlaylistSettings
from src.adapters._rabbit.dto.order import NewOrderPayload
from src.adapters._redis.broker import redis_adapter
from src.log_setup import LOGGER
from src.utils import is_broadcaster_or_moderator


# async def get_settings(user_id, playlist_name) -> ReadPlaylistSettings:
#     # redis schema - {user_id}:{playlist_name}:settings
#     raw_settings = redis_adapter.get(f"{user_id}:{playlist_name}:settings")

#     if not raw_settings:
#         settings = await PlaylistACL.fetch_playlist_settings(user_id, playlist_name)
#     else:
#         settings = ReadPlaylistSettings.model_validate_json(raw_settings)

#     return settings


class MusicRequest(commands.Component):
    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    @commands.group(invoke_fallback=True)
    async def mr(self, ctx: commands.Context, yt_url: str) -> None:
        music_request_enable = bool(redis_adapter.get(f"{ctx.channel.name}:mr:enable"))

        LOGGER.info(f"yt_url: {yt_url}")
        if not music_request_enable:
            await ctx.reply("Заказ музыки сейчас не доступен.")
            LOGGER.info(f"{ctx.author.name} попытался поставить музыку. url: {yt_url}")
            return

        # yt_id = extract_youtube_video_id(yt_url)
        # if not yt_id:
        #     await ctx.reply("Неправильная ссылка.")
        #     LOGGER.info(f"{ctx.author.name} попытался поставить музыку. url: {yt_url}")
        #     return

        # user_id = await get_user_id(ctx.broadcaster.id)
        # settings = await get_settings(user_id, playlist_name)

        # # Валидейтим настройки в пайдентик объект и проверяем чёрные списки, кулдауны,
        # if settings.is_active is False:
        #     await ctx.reply("Данный плейлист не активен.")

        # elif f"ttv:{ctx.author.name}" in settings.user_black_list:
        #     await ctx.reply("Вы находитесь в чёрном списке этого плейлиста.")

        # elif yt_id in settings.track_black_list:
        #     await ctx.reply("Трек находится в чёрном списке.")

        # elif bool(redis_adapter.get(f"{playlist_name}:cooldown:{yt_id}")):
        #     await ctx.reply(
        #         f"Трек заказавали в течении {settings.track_cooldown} секунд. Пожалуйста, подождите немного и попробуйте ещё раз."
        #     )

        # else:
        priority_song = []
        author: Chatter = ctx.author  # type: ignore
        if author.broadcaster:
            priority_song.append("broadcaster")
        if author.moderator:
            priority_song.append("moderator")
        if author.vip:
            priority_song.append("vip")
        if author.subscriber:
            priority_song.append("subscriber")
        if author.turbo:
            priority_song.append("turbo")
        if author.artist:
            priority_song.append("tartist")
        # if await author.follow_info():
        #     priority_song.append("o")
        if author.founder:
            priority_song.append("founder")

        LOGGER.info(f"mr {ctx.chatter.name} -> {ctx.author.name} url: {yt_url} priority: {':'.join(priority_song)} ")

        await ctx.reply("Обрабатываю заказ...")

        self.bot.safe_dispatch(
            "new_order",
            payload=NewOrderPayload(
                broadcaster_id=str(ctx.channel.id),
                chatter_id=str(ctx.author.id),
                chatter_nickname=ctx.author.name or "annonymous",
                yt_video_url=yt_url,
                priority=":".join(priority_song),
            ),
        )

    @is_broadcaster_or_moderator()
    @mr.command(name="on")
    async def mr_on(self, ctx: commands.Context) -> None:
        redis_adapter.set(name=f"{ctx.channel.name}:mr:enable", value=1)
        await ctx.send("Заказ музыки включён.")
        LOGGER.info(f"{ctx.author.name} включил заказ музыки.")

    @is_broadcaster_or_moderator()
    @mr.command(name="off")
    async def mr_off(self, ctx: commands.Context) -> None:
        redis_adapter.set(name=f"{ctx.channel.name}:mr:enable", value=0)
        await ctx.send("Заказ музыки выключен.")
        LOGGER.info(f"{ctx.author.name} выключил заказ музыки.")

    @mr.group(name="points", invoke_fallback=True)
    async def mr_points(self, ctx: commands.Context, state: Literal["on", "off"]) -> None:
        # TODO информационная сводка
        pass

    @is_broadcaster_or_moderator()
    @mr_points.command(name="on")
    async def mr_points_on(self, ctx: commands.Context) -> None:
        await ctx.broadcaster.update_custom_reward(id="music_request_points", enabled=True)
        redis_adapter.set(name=f"{ctx.channel.name}_music_request_forpoints_enable", value=1)
        await ctx.send("Заказ музыки за баллы включен.")
        LOGGER.info(f"{ctx.author.name} включил заказ музыки за баллы канала.")

    @is_broadcaster_or_moderator()
    @mr_points.command(name="off")
    async def mr_points_off(self, ctx: commands.Context) -> None:
        await ctx.broadcaster.update_custom_reward(id="music_request_points", enabled=False)
        redis_adapter.set(name=f"{ctx.channel.name}_music_request_forpoints_enable", value=0)
        await ctx.send("Заказ музыки за баллы выключен.")
        LOGGER.info(f"{ctx.author.name} выключил заказ музыки за баллы канала.")

    @commands.reward_command(id="music_request_points")
    async def music_request_by_points(self, ctx: commands.Context, msg: str) -> None:
        music_request_forpoints_enable = bool(redis_adapter.get(f"{ctx.channel.name}_music_request_forpoints_enable"))

        yt_url = msg

        if not music_request_forpoints_enable:
            await ctx.send("Заказ музыки за баллы сейчас не доступен.")
            LOGGER.info(f"{ctx.author.name} попытался поставить музыку. url: {yt_url}")
            return

        # yt_id = extract_youtube_video_id(yt_url)

        # if not yt_id:
        #     await ctx.send("Неправильная ссылка.")
        #     if ctx.redemption:
        #         ctx.redemption.status = "canceled"
        #     LOGGER.info(f"{ctx.author.name} попытался поставить музыку. url: {yt_url}")
        #     return

        priority_song = ["p"]
        if ctx.author.broadcaster:  # type: ignore
            priority_song.append("b")
        if ctx.author.moderator:  # type: ignore
            priority_song.append("m")
        if ctx.author.vip:  # type: ignore
            priority_song.append("v")
        if ctx.author.subscriber:  # type: ignore
            priority_song.append("s")
        if ctx.author.turbo:  # type: ignore
            priority_song.append("t")
        if ctx.author.artist:  # type: ignore
            priority_song.append("a")

        LOGGER.info(f"!mr {ctx.chatter.name} -> {ctx.author.name} url: {yt_url} priority: {''.join(priority_song)} ")

        await ctx.send(f"url={yt_url}")

        self.bot.safe_dispatch(
            "new_order",
            payload=NewOrderPayload(
                broadcaster_id=int(ctx.channel.id),
                chatter_id=int(ctx.author.id),
                chatter_nickname=ctx.author.name or "annonymous",
                yt_video_url=yt_url,
                priority="".join(priority_song),
            ),
        )
