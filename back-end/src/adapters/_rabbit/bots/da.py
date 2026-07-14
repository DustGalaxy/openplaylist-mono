import json

from faststream import Context
from faststream.rabbit.message import RabbitMessage
from faststream.rabbit import RabbitRouter

from src.adapters._rabbit.bots.dto import DATokenRefreshed, DAUser as DAUser_Rabbit
from src.adapters._rabbit.queues import (
    main_exchange,
    auth_user_da_all_request,
    auth_user_da_tokens_refreshed,
    bot_da_order_new,
)
from src.dto.order import DANewOrder
from src._types import IntegrationPlatform
from src.database import async_session_maker

from src.dal.postgres.token import token_vault_repository
from src.dal.postgres.linked_account import linked_accounts_repository

from src.utils import kick


router = RabbitRouter()


@router.subscriber(bot_da_order_new, exchange=main_exchange)
async def order_new_from_da(
    message: RabbitMessage = Context(),
):
    await message.ack()
    event: DANewOrder = DANewOrder.model_validate_json(message.body)

    from taskiq_broker import task_broker as taskiq_broker

    await kick("order.new", taskiq_broker, event, False, labels={"user_id": str(event.owner_id)})


@router.subscriber(auth_user_da_all_request, exchange=main_exchange)
async def get_all_da_users(
    message: RabbitMessage = Context(),
):
    await message.ack()

    async with async_session_maker() as session:
        tokens = await token_vault_repository.get_all_by_platform(session, IntegrationPlatform.DA)

        return [
            DAUser_Rabbit(
                user_id=token.linked_account.user_id,
                da_id=token.linked_account.platform_user_id,
                access_token=token.access_token,
                refresh_token=token.refresh_token,  # type: ignore
                expires_at=token.expires_at,  # type: ignore
            )
            for token in tokens
        ]


@router.subscriber(auth_user_da_tokens_refreshed, exchange=main_exchange)
async def da_refresh_tokens(
    message: RabbitMessage = Context(),
):
    await message.ack()
    event: DATokenRefreshed = DATokenRefreshed.model_validate_json(message.body)
    async with async_session_maker() as session:
        link = await linked_accounts_repository.get_by_id_platform(
            session, event.platform_user_id, IntegrationPlatform.DA
        )
        tokens = await token_vault_repository.get_by_id_link(session, link.id)

        if not link:
            return
        tokens.access_token = event.access_token
        tokens.refresh_token = event.refresh_token
        tokens.expires_at = event.expires_at
        await token_vault_repository.update(session, tokens)


@router.subscriber("da.user.token.died", exchange=main_exchange)
async def user_token_died(
    message: RabbitMessage = Context(),
):
    await message.ack()
    event: dict = json.loads(message.body)
    async with async_session_maker() as session:
        from src.services.auth.auth_service import auth_service

        await auth_service.bot_was_disconnected(session, IntegrationPlatform.TWITCH, event["platform_user_id"])
