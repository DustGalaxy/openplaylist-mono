from faststream.rabbit import RabbitBroker, RabbitExchange, RabbitQueue, ExchangeType

from src.settings import settings

rabbit_broker = RabbitBroker(settings.RABBITMQ_URL)

main_exchange = RabbitExchange("main_exchange", type=ExchangeType.DIRECT, durable=True)

auth_user_donatex_all_request = RabbitQueue("auth.user.donatex.all.request", durable=True)
auth_user_donatex_all_response = RabbitQueue("auth.user.donatex.all.response", durable=True)
auth_user_donatex_tokens_refreshed = RabbitQueue("auth.user.donatex.tokens.refreshed", durable=True)
bot_donatex_connect_request = RabbitQueue("bot.donatex.connect.request", durable=True)
bot_donatex_disconnect = RabbitQueue("bot.donatex.disconect", durable=True)
user_token_died = RabbitQueue("donatex.user.token.died", durable=True)
playlist_settings_exchange = RabbitExchange("config_fanout_exchange", durable=False, auto_delete=True)
playlist_settings_request = RabbitQueue("playlist.settings.request", durable=True)

order_new = RabbitQueue("bot.donatex.order.new", durable=True)
