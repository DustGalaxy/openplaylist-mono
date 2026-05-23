from faststream.rabbit import RabbitBroker, RabbitExchange, RabbitQueue, ExchangeType

from settings import settings

broker = RabbitBroker(settings.RABBITMQ_URL)

main_exchange = RabbitExchange("main_exchange", type=ExchangeType.DIRECT, durable=True)
topic_exchange = RabbitExchange("topic_exchange", type=ExchangeType.TOPIC, durable=True)


auth_user_da_all_request = RabbitQueue("auth.user.da.all.request", durable=True)
auth_user_da_all_response = RabbitQueue("auth.user.da.all.response", durable=True)

auth_user_da_tokens_refreshed = RabbitQueue("auth.user.da.tokens.refreshed", durable=True)
auth_user_twitch_tokens_refreshed = RabbitQueue("auth.user.twtich.tokens.refreshed", durable=True)

auth_user_twitch_all_request = RabbitQueue("auth.user.twitch.all.request", durable=True)

bot_twitch_connect_request = RabbitQueue("bot.twitch.connect.request", durable=True)
bot_twitch_connect_response = RabbitQueue("bot.twitch.connect.response", durable=True)
bot_twitch_order_new = RabbitQueue("bot.twitch.order.new", durable=True)
bot_twitch_ack_connection = RabbitQueue("bot.twitch.ack.connection", durable=True)

bot_da_connect_request = RabbitQueue("bot.da.connect.request", durable=True)
bot_da_connect_response = RabbitQueue("bot.da.connect.response", durable=True)
bot_da_order_new = RabbitQueue("bot.da.order.new", durable=True)
bot_da_ack_connection = RabbitQueue("bot.da.ack.connection", durable=True)

playlist_order_created = RabbitQueue("playlist.order.created", durable=True)

playlist_track_playnow = RabbitQueue("playlist.track.playnow", durable=True)
playlist_track_added = RabbitQueue("playlist.track.added", durable=True)
playlist_track_deleted = RabbitQueue("playlist.track.deleted", durable=True)
playlist_settings_changed = RabbitQueue("playlist.settings.changed", durable=True)
playlist_track_move = RabbitQueue("playlist.track.move", durable=True)

playlist_privacy_private = RabbitQueue("playlist.privacy.private", durable=True)
playlist_privacy_public = RabbitQueue("playlist.privacy.public", durable=True)

playlist_settings_request = RabbitQueue("playlist.settings.request", durable=True, exclusive=True)


async def declare():
    print("Declaring exchanges and queues...")
    await broker.declare_exchange(main_exchange)
    await broker.declare_exchange(topic_exchange)
    await broker.declare_queue(auth_user_da_all_request)
    await broker.declare_queue(auth_user_da_all_response)
    await broker.declare_queue(auth_user_da_tokens_refreshed)
    await broker.declare_queue(auth_user_twitch_tokens_refreshed)
    await broker.declare_queue(auth_user_twitch_all_request)
    await broker.declare_queue(bot_twitch_connect_request)
    await broker.declare_queue(bot_twitch_connect_response)
    await broker.declare_queue(bot_da_connect_request)
    await broker.declare_queue(bot_da_connect_response)
    await broker.declare_queue(playlist_order_created)
    await broker.declare_queue(playlist_track_playnow)
    await broker.declare_queue(playlist_track_added)
    await broker.declare_queue(playlist_track_deleted)
    await broker.declare_queue(playlist_settings_changed)
    await broker.declare_queue(playlist_track_move)
    await broker.declare_queue(playlist_privacy_private)
    await broker.declare_queue(playlist_privacy_public)
    await broker.declare_queue(playlist_settings_request)
