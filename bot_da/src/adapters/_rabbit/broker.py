from faststream.rabbit import RabbitBroker, RabbitExchange, RabbitQueue, ExchangeType

from config import settings

rabbit_broker = RabbitBroker(settings.RABBITMQ_URL)

main_exchange = RabbitExchange("main_exchange", type=ExchangeType.DIRECT, durable=True)

auth_user_da_all_request = RabbitQueue("auth.user.da.all.request", durable=True)
auth_user_da_all_response = RabbitQueue("auth.user.da.all.response", durable=True)

auth_user_da_tokens_refreshed = RabbitQueue("auth.user.da.tokens.refreshed", durable=True)

playlist_settings_exchange = RabbitExchange("config_fanout_exchange", durable=False, auto_delete=True)

playlist_settings_request = RabbitQueue("playlist.settings.request", durable=True)
bot_da_disconect = RabbitQueue("bot.da.disconnect", durable=True)
bot_da_connect_request = RabbitQueue("bot.da.connect.request", durable=True)

order_new = RabbitQueue("bot.da.order.new", durable=True)
