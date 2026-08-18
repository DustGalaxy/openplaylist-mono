from faststream.rabbit import RabbitExchange, RabbitQueue, ExchangeType

main_exchange = RabbitExchange("main_exchange", type=ExchangeType.DIRECT, durable=True)
topic_exchange = RabbitExchange("topic_exchange", type=ExchangeType.TOPIC, durable=True)

playlist_fanout_exchange = RabbitExchange("playlist_fanout_exchange", type=ExchangeType.FANOUT, durable=True)
user_fanout_exchange = RabbitExchange("user_fanout_exchange", type=ExchangeType.FANOUT, durable=True)


# --- donation alerts

auth_user_da_all_request = RabbitQueue("auth.user.da.all.request", durable=True)
auth_user_da_all_response = RabbitQueue("auth.user.da.all.response", durable=True)
auth_user_da_tokens_refreshed = RabbitQueue("auth.user.da.tokens.refreshed", durable=True)

bot_da_connect_request = RabbitQueue("bot.da.connect.request", durable=True)
bot_da_connect_response = RabbitQueue("bot.da.connect.response", durable=True)
bot_da_order_new = RabbitQueue("bot.da.order.new", durable=True)
bot_da_ack_connection = RabbitQueue("bot.da.ack.connection", durable=True)
bot_da_disconect = RabbitQueue("bot.da.disconnect", durable=True)

# --- twitch

auth_user_twitch_tokens_refreshed = RabbitQueue("auth.user.twitch.tokens.refreshed", durable=True)
auth_user_twitch_all_request = RabbitQueue("auth.user.twitch.all.request", durable=True)

bot_twitch_connect_request = RabbitQueue("bot.twitch.connect.request", durable=True)
bot_twitch_connect_response = RabbitQueue("bot.twitch.connect.response", durable=True)
bot_twitch_order_new = RabbitQueue("bot.twitch.order.new", durable=True)
bot_twitch_ack_connection = RabbitQueue("bot.twitch.ack.connection", durable=True)
bot_twitch_disconect = RabbitQueue("bot.twitch.disconnect", durable=True)
bot_twitch_settings = RabbitQueue("bot.twitch.settings", durable=True)

# --- google

bot_google_connect_request = RabbitQueue("bot.google.connect.request", durable=True)
bot_google_disconect = RabbitQueue("bot.google.disconnect", durable=True)

# --- donatex

auth_user_donatex_tokens_refreshed = RabbitQueue("auth.user.donatex.tokens.refreshed", durable=True)
auth_user_donatex_all_request = RabbitQueue("auth.user.donatex.all.request", durable=True)

bot_donatex_connect_request = RabbitQueue("bot.donatex.connect.request", durable=True)
bot_donatex_connect_response = RabbitQueue("bot.donatex.connect.response", durable=True)
bot_donatex_order_new = RabbitQueue("bot.donatex.order.new", durable=True)
bot_donatex_ack_connection = RabbitQueue("bot.donatex.ack.connection", durable=True)
bot_donatex_disconect = RabbitQueue("bot.donatex.disconnect", durable=True)

# --- donatepay

auth_user_donatepay_tokens_refreshed = RabbitQueue("auth.user.donatepay.tokens.refreshed", durable=True)
auth_user_donatepay_all_request = RabbitQueue("auth.user.donatepay.all.request", durable=True)

bot_donatepay_connect_request = RabbitQueue("bot.donatepay.connect.request", durable=True)
bot_donatepay_connect_response = RabbitQueue("bot.donatepay.connect.response", durable=True)
bot_donatepay_order_new = RabbitQueue("bot.donatepay.order.new", durable=True)
bot_donatepay_ack_connection = RabbitQueue("bot.donatepay.ack.connection", durable=True)
bot_donatepay_disconect = RabbitQueue("bot.donatepay.disconnect", durable=True)

# --- status and internal

playlist_order_created = RabbitQueue("playlist.order.created", durable=True)

playlist_track_playnow = RabbitQueue("playlist.track.playnow", durable=True)
playlist_track_added = RabbitQueue("playlist.track.added", durable=True)
playlist_track_deleted = RabbitQueue("playlist.track.deleted", durable=True)
playlist_settings_changed = RabbitQueue("playlist.settings.changed", durable=True)
playlist_track_move = RabbitQueue("playlist.track.move", durable=True)

playlist_privacy_private = RabbitQueue("playlist.privacy.private", durable=True)
playlist_privacy_public = RabbitQueue("playlist.privacy.public", durable=True)

playback_pause_queue = RabbitQueue("playback.pause", durable=True)
playback_seek_queue = RabbitQueue("playback.seek", durable=True)

# --- bot order status feedback
bot_order_completed = RabbitQueue("bot.order.completed", durable=True)
bot_order_cancelled = RabbitQueue("bot.order.cancelled", durable=True)
bot_order_partially_completed = RabbitQueue("bot.order.partially_completed", durable=True)


