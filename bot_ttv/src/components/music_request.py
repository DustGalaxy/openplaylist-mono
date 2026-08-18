import twitchio
from src.adapters._rabbit.dto.order import NewOrderPayload
from src.adapters._redis.broker import redis_adapter
from src.log_setup import LOGGER
from src.utils import extract_youtube_video_id, is_broadcaster_or_moderator
from twitchio import Chatter
from twitchio.ext import commands
from twitchio.models.eventsub_ import ChannelPointsRedemptionAdd


def extract_user_roles(author: Chatter) -> list[str]:
    """Extract list of role names based on chatter badges/status."""
    roles: list[str] = []
    if getattr(author, "broadcaster", False):
        roles.append("broadcaster")
    if getattr(author, "moderator", False):
        roles.append("moderator")
    if getattr(author, "vip", False):
        roles.append("vip")
    if getattr(author, "subscriber", False):
        roles.append("subscriber")
    if getattr(author, "turbo", False):
        roles.append("turbo")
    if getattr(author, "artist", False):
        roles.append("artist")
    if getattr(author, "founder", False):
        roles.append("founder")
    return roles


def is_mr_enabled(channel_id: str, channel_name: str) -> bool:
    """Check if music request is enabled (supporting both new and legacy Redis keys)."""
    val = redis_adapter.get(f"ttv:channel:{channel_id}:mr_enabled")
    if val is None:
        val = redis_adapter.get(f"{channel_name}:mr:enable")
    if val is None:
        return False
    if isinstance(val, bytes):
        val = val.decode("utf-8")
    return bool(int(val))


def set_mr_enabled(channel_id: str, channel_name: str, enabled: bool) -> None:
    """Set music request enable status across standard and legacy Redis keys."""
    val = 1 if enabled else 0
    redis_adapter.set(name=f"ttv:channel:{channel_id}:mr_enabled", value=val)
    redis_adapter.set(name=f"{channel_name}:mr:enable", value=val)


def is_mr_points_enabled(channel_id: str, channel_name: str) -> bool:
    """Check if points music request is enabled."""
    val = redis_adapter.get(f"ttv:channel:{channel_id}:points_enabled")
    if val is None:
        val = redis_adapter.get(f"{channel_name}_music_request_forpoints_enable")
    if val is None:
        return False
    if isinstance(val, bytes):
        val = val.decode("utf-8")
    return bool(int(val))


def set_mr_points_enabled(channel_id: str, channel_name: str, enabled: bool) -> None:
    """Set points music request enable status across standard and legacy Redis keys."""
    val = 1 if enabled else 0
    redis_adapter.set(name=f"ttv:channel:{channel_id}:points_enabled", value=val)
    redis_adapter.set(name=f"{channel_name}_music_request_forpoints_enable", value=val)


def get_channel_reward_id(channel_id: str) -> str | None:
    """Get the cached custom reward ID for a broadcaster channel."""
    val = redis_adapter.get(f"ttv:channel:{channel_id}:reward_id")
    if val is None:
        return None
    if isinstance(val, bytes):
        return val.decode("utf-8")
    return str(val)


def set_channel_reward_id(channel_id: str, reward_id: str) -> None:
    """Cache the custom reward ID for a broadcaster channel."""
    redis_adapter.set(name=f"ttv:channel:{channel_id}:reward_id", value=reward_id)


async def get_or_create_channel_reward(broadcaster: twitchio.PartialUser) -> str | None:
    """Find an existing OpenPlaylist reward or create a new one on the broadcaster channel."""
    channel_id = str(broadcaster.id)
    cached_id = get_channel_reward_id(channel_id)

    if cached_id:
        try:
            rewards = await broadcaster.fetch_custom_rewards(ids=[cached_id])
            if rewards:
                return cached_id
        except Exception as e:
            LOGGER.warning(f"Cached reward {cached_id} not valid on Twitch: {e}")

    try:
        # Check manageable rewards created by our client
        rewards = await broadcaster.fetch_custom_rewards(manageable=True)
        for r in rewards:
            if "Заказ музыки" in r.title or "OpenPlaylist" in r.title or "Заказ трека" in r.title:
                set_channel_reward_id(channel_id, r.id)
                return r.id

        # Create new default reward
        new_reward = await broadcaster.create_custom_reward(
            title="Заказ музыки (OpenPlaylist)",
            cost=500,
            prompt="Вставьте ссылку на YouTube видео",
            enabled=True,
        )
        set_channel_reward_id(channel_id, new_reward.id)
        LOGGER.info(f"Created new OpenPlaylist reward for channel {channel_id}: {new_reward.id}")
        return new_reward.id
    except Exception as e:
        LOGGER.error(f"Failed to get or create custom reward on channel {channel_id}: {e}")
        return None


class MusicRequest(commands.Component):
    def __init__(self, bot: commands.Bot) -> None:
        self.bot = bot

    @commands.group(invoke_fallback=True)
    async def mr(self, ctx: commands.Context, yt_url: str) -> None:
        channel_id = str(ctx.channel.id)
        channel_name = ctx.channel.name or ""

        if not is_mr_enabled(channel_id, channel_name):
            await ctx.reply("Заказ музыки сейчас не доступен.")
            LOGGER.info(f"{ctx.author.name} попытался поставить музыку, но прием отключен: {yt_url}")
            return

        yt_id = extract_youtube_video_id(yt_url)
        if not yt_id:
            await ctx.reply("Некорректная ссылка на YouTube видео.")
            LOGGER.info(f"{ctx.author.name} передал невалидный YouTube URL: {yt_url}")
            return

        roles = extract_user_roles(ctx.author)  # type: ignore
        priority = ":".join(roles)

        LOGGER.info(f"mr {ctx.chatter.name} -> {ctx.author.name} url: {yt_url} priority: {priority}")
        await ctx.reply("Обрабатываю заказ...")

        self.bot.safe_dispatch(
            "new_order",
            payload=NewOrderPayload(
                broadcaster_id=channel_id,
                chatter_id=str(ctx.author.id),
                chatter_nickname=ctx.author.name or "anonymous",
                yt_video_url=yt_url,
                priority=priority,
            ),
        )

    @is_broadcaster_or_moderator()
    @mr.command(name="on")
    async def mr_on(self, ctx: commands.Context) -> None:
        set_mr_enabled(str(ctx.channel.id), ctx.channel.name or "", True)
        await ctx.send("Заказ музыки включён.")
        LOGGER.info(f"{ctx.author.name} включил заказ музыки.")

    @is_broadcaster_or_moderator()
    @mr.command(name="off")
    async def mr_off(self, ctx: commands.Context) -> None:
        set_mr_enabled(str(ctx.channel.id), ctx.channel.name or "", False)
        await ctx.send("Заказ музыки выключен.")
        LOGGER.info(f"{ctx.author.name} выключил заказ музыки.")

    @mr.group(name="points", invoke_fallback=True)
    async def mr_points(self, ctx: commands.Context) -> None:
        channel_id = str(ctx.channel.id)
        channel_name = ctx.channel.name or ""
        enabled = is_mr_points_enabled(channel_id, channel_name)
        reward_id = get_channel_reward_id(channel_id)
        status_str = "Включен" if enabled else "Выключен"
        reward_str = f"ID: {reward_id}" if reward_id else "Награда еще не создана"
        await ctx.send(f"Заказ за баллы: {status_str} ({reward_str}). Управление: !mr points on/off/cost/title/prompt/link")

    @is_broadcaster_or_moderator()
    @mr_points.command(name="on")
    async def mr_points_on(self, ctx: commands.Context) -> None:
        channel_id = str(ctx.channel.id)
        reward_id = await get_or_create_channel_reward(ctx.broadcaster)
        if reward_id:
            try:
                await ctx.broadcaster.update_custom_reward(id=reward_id, enabled=True)
            except Exception as e:
                LOGGER.warning(f"Failed to enable reward on Twitch: {e}")

        set_mr_points_enabled(channel_id, ctx.channel.name or "", True)
        await ctx.send("Заказ музыки за баллы включен.")
        LOGGER.info(f"{ctx.author.name} включил заказ музыки за баллы канала.")

    @is_broadcaster_or_moderator()
    @mr_points.command(name="off")
    async def mr_points_off(self, ctx: commands.Context) -> None:
        channel_id = str(ctx.channel.id)
        reward_id = get_channel_reward_id(channel_id)
        if reward_id:
            try:
                await ctx.broadcaster.update_custom_reward(id=reward_id, enabled=False)
            except Exception as e:
                LOGGER.warning(f"Failed to disable reward on Twitch: {e}")

        set_mr_points_enabled(channel_id, ctx.channel.name or "", False)
        await ctx.send("Заказ музыки за баллы выключен.")
        LOGGER.info(f"{ctx.author.name} выключил заказ музыки за баллы канала.")

    @is_broadcaster_or_moderator()
    @mr_points.command(name="cost")
    async def mr_points_cost(self, ctx: commands.Context, amount: int) -> None:
        if amount <= 0:
            await ctx.send("Стоимость должна быть больше 0.")
            return

        reward_id = await get_or_create_channel_reward(ctx.broadcaster)
        if not reward_id:
            await ctx.send("Не удалось получить или создать награду на Twitch.")
            return

        try:
            await ctx.broadcaster.update_custom_reward(id=reward_id, cost=amount)
            await ctx.send(f"Стоимость заказа музыки обновлена: {amount} баллов.")
            LOGGER.info(f"{ctx.author.name} обновил стоимость награды: {amount} баллов.")
        except Exception as e:
            LOGGER.error(f"Failed to update reward cost: {e}")
            await ctx.send(f"Ошибка при обновлении стоимости награды: {e}")

    @is_broadcaster_or_moderator()
    @mr_points.command(name="title")
    async def mr_points_title(self, ctx: commands.Context, *, title: str) -> None:
        title = title.strip()
        if not title:
            await ctx.send("Название не может быть пустым.")
            return

        reward_id = await get_or_create_channel_reward(ctx.broadcaster)
        if not reward_id:
            await ctx.send("Не удалось получить или создать награду на Twitch.")
            return

        try:
            await ctx.broadcaster.update_custom_reward(id=reward_id, title=title)
            await ctx.send(f"Название награды обновлено: {title}")
            LOGGER.info(f"{ctx.author.name} обновил название награды: {title}")
        except Exception as e:
            LOGGER.error(f"Failed to update reward title: {e}")
            await ctx.send(f"Ошибка при обновлении названия награды: {e}")

    @is_broadcaster_or_moderator()
    @mr_points.command(name="prompt")
    async def mr_points_prompt(self, ctx: commands.Context, *, prompt: str) -> None:
        prompt = prompt.strip()
        reward_id = await get_or_create_channel_reward(ctx.broadcaster)
        if not reward_id:
            await ctx.send("Не удалось получить или создать награду на Twitch.")
            return

        try:
            await ctx.broadcaster.update_custom_reward(id=reward_id, prompt=prompt)
            await ctx.send(f"Подсказка для зрителей обновлена: {prompt}")
            LOGGER.info(f"{ctx.author.name} обновил подсказку награды: {prompt}")
        except Exception as e:
            LOGGER.error(f"Failed to update reward prompt: {e}")
            await ctx.send(f"Ошибка при обновлении подсказки награды: {e}")

    @is_broadcaster_or_moderator()
    @mr_points.command(name="link")
    async def mr_points_link(self, ctx: commands.Context, reward_id: str) -> None:
        reward_id = reward_id.strip()
        set_channel_reward_id(str(ctx.channel.id), reward_id)
        await ctx.send(f"Награда за баллы привязана: {reward_id}")
        LOGGER.info(f"{ctx.author.name} вручную привязал reward_id: {reward_id}")

    @is_broadcaster_or_moderator()
    @mr_points.command(name="sync")
    async def mr_points_sync(self, ctx: commands.Context) -> None:
        """Синхронизировать награду за баллы с Twitch API и обновить кеш."""
        reward_id = await get_or_create_channel_reward(ctx.channel)
        if reward_id:
            await ctx.send(f"Награда за баллы синхронизирована: {reward_id}")
        else:
            await ctx.send("Не удалось синхронизировать награду за баллы.")

    @commands.Component.listener()
    async def event_custom_redemption_add(
        self, payload: ChannelPointsRedemptionAdd
    ) -> None:
        channel_id = str(payload.broadcaster.id)
        channel_name = payload.broadcaster.name or ""
        saved_reward_id = get_channel_reward_id(channel_id)

        LOGGER.info(
            f"Received Channel Points Redemption: id={payload.id}, reward_id={payload.reward.id}, title='{payload.reward.title}', user={payload.user.name}, input='{payload.user_input}'"
        )

        # Filter only redemptions for our linked reward if one is configured
        if saved_reward_id and str(payload.reward.id) != saved_reward_id:
            LOGGER.debug(f"Ignoring redemption for unlinked reward {payload.reward.id} (linked is {saved_reward_id})")
            return

        if not is_mr_points_enabled(channel_id, channel_name):
            try:
                await payload.refund(token_for=channel_id)
            except Exception as e:
                LOGGER.error(f"Failed to refund redemption: {e}")
            user = self.bot.create_partialuser(user_id=channel_id)
            await user.send_message(
                sender=self.bot.bot_id,
                message=f"@{payload.user.name} Заказ музыки за баллы сейчас не доступен. Баллы возвращены.",
            )
            return

        yt_url = (payload.user_input or "").strip()
        yt_id = extract_youtube_video_id(yt_url)
        if not yt_id:
            try:
                await payload.refund(token_for=channel_id)
            except Exception as e:
                LOGGER.error(f"Failed to refund redemption: {e}")
            user = self.bot.create_partialuser(user_id=channel_id)
            await user.send_message(
                sender=self.bot.bot_id,
                message=f"@{payload.user.name} Некорректная ссылка на YouTube видео. Баллы возвращены.",
            )
            return

        normalized_url = f"https://www.youtube.com/watch?v={yt_id}"
        priority = "points"
        LOGGER.info(f"Channel Points Order from {payload.user.name} in channel {channel_name}: {normalized_url}")

        self.bot.safe_dispatch(
            "new_order",
            payload=NewOrderPayload(
                broadcaster_id=channel_id,
                chatter_id=str(payload.user.id),
                chatter_nickname=payload.user.name or "anonymous",
                yt_video_url=normalized_url,
                priority=priority,
                reward_id=str(payload.reward.id),
                redemption_id=str(payload.id),
            ),
        )


