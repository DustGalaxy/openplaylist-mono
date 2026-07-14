# async def declare():
#     print("Declaring exchanges and queues...")
#     await broker.declare_exchange(main_exchange)
#     await broker.declare_exchange(topic_exchange)
#     await broker.declare_exchange(fanout_exchange)
#     # --- donation alerts
#     await broker.declare_queue(auth_user_da_all_request)
#     await broker.declare_queue(auth_user_da_all_response)
#     await broker.declare_queue(auth_user_da_tokens_refreshed)
#     await broker.declare_queue(bot_da_connect_request)
#     await broker.declare_queue(bot_da_connect_response)
#     # --- twitch
#     await broker.declare_queue(auth_user_twitch_tokens_refreshed)
#     await broker.declare_queue(auth_user_twitch_all_request)
#     await broker.declare_queue(bot_twitch_connect_request)
#     await broker.declare_queue(bot_twitch_connect_response)
#     # --- donatex
#     await broker.declare_queue(auth_user_donatex_tokens_refreshed)
#     await broker.declare_queue(auth_user_donatex_all_request)
#     await broker.declare_queue(bot_donatex_connect_request)
#     await broker.declare_queue(bot_donatex_connect_response)
#     # --- status and internal
#     await broker.declare_queue(playlist_order_created)
#     await broker.declare_queue(playlist_track_playnow)
#     await broker.declare_queue(playlist_track_added)
#     await broker.declare_queue(playlist_track_deleted)
#     await broker.declare_queue(playlist_settings_changed)
#     await broker.declare_queue(playlist_track_move)
#     await broker.declare_queue(playlist_privacy_private)
#     await broker.declare_queue(playlist_privacy_public)
#     # await broker.declare_queue(playlist_settings_request)

from faststream.rabbit import RabbitBroker

from src.settings import settings

broker = RabbitBroker(settings.RABBITMQ_URL)

main_publisher = broker.publisher()

def get_broker():
    return broker
