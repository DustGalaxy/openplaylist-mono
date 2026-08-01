from faststream.rabbit import ExchangeType, RabbitBroker, RabbitExchange, RabbitQueue
from src.config import settings

bot_order_completed = RabbitQueue("bot.order.completed", durable=True)
bot_order_cancelled = RabbitQueue("bot.order.cancelled", durable=True)
bot_order_partially_completed = RabbitQueue("bot.order.partially_completed", durable=True)

playlist_settings_request = RabbitQueue("playlist.settings.request", durable=True)
auth_user_twitch_tokens_refreshed = RabbitQueue("auth.user.twtich.tokens.refreshed", durable=True)
user_token_died = RabbitQueue("twitch.user.token.died", durable=True)

bot_twitch_connect_request = RabbitQueue("bot.twitch.connect.request", durable=True)
bot_twitch_disconnect = RabbitQueue("bot.twitch.disconnect", durable=True)
bot_twitch_settings = RabbitQueue("bot.twitch.settings", durable=True)

main_exchange = RabbitExchange("main_exchange", ExchangeType.DIRECT, durable=True)
topic_exchange = RabbitExchange("topic_exchange", ExchangeType.TOPIC, durable=True)

broker = RabbitBroker(settings.RABBITMQ_URL)
