from faststream.rabbit import RabbitBroker, RabbitExchange, ExchangeType, RabbitQueue

from src.config import settings


bot_order_completed = RabbitQueue("bot.order.completed", durable=True)
bot_order_cancelled = RabbitQueue("bot.order.cancelled", durable=True)

playlist_settings_request = RabbitQueue("playlist.settings.request", durable=True)
auth_user_twitch_tokens_refreshed = RabbitQueue("auth.user.twtich.tokens.refreshed", durable=True)

bot_twitch_connect_request = RabbitQueue("bot.twitch.connect.request", durable=True)
bot_twitch_disconnect_request = RabbitQueue("bot.twitch.disconnect.request", durable=True)
main_exchange = RabbitExchange("main_exchange", ExchangeType.DIRECT, durable=True)
broker = RabbitBroker(settings.RABBITMQ_URL)
