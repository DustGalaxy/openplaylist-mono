import json

from faststream import Context
from faststream.rabbit.message import RabbitMessage
from simple_repository.exceptions import NotFoundException

from src.adapters._rabbit.event_broker import (
    get_broker,
    main_exchange,
    bot_donatex_order_new,
    auth_user_donatex_all_request,
    auth_user_donatex_tokens_refreshed,
)
from src.dto.order import DonatexNewOrder
from src.adapters._rabbit.dto import Tokens, DonateXTokenRefreshed

from src.dal.postgres.token import token_vault_repository
from src.dal.postgres.linked_account import linked_accounts_repository
from src._types import IntegrationPlatform
from src.database import async_session_maker
from src.utils import kick

broker = get_broker()


@broker.subscriber(bot_donatex_order_new, exchange=main_exchange)
async def order_new_from_donatex(
    message: RabbitMessage = Context(),
):
    await message.ack()
    event: DonatexNewOrder = DonatexNewOrder.model_validate_json(message.body)

    from taskiq_broker import task_broker as taskiq_broker

    await kick("order.new", taskiq_broker, event, False, labels={"user_id": str(event.owner_id)})


@broker.subscriber(auth_user_donatex_all_request, exchange=main_exchange)
async def get_all_donatex_users(
    message: RabbitMessage = Context(),
):
    await message.ack()
    print("get_all_donatex_users")
    async with async_session_maker() as session:
        from src.services.auth.auth_service import auth_service

        tokens = await auth_service.get_all_tokens(session, IntegrationPlatform.DONATEX)
        return [
            Tokens(
                user_id=str(token.linked_account.user_id),
                access_token=token.access_token,
                refresh_token=token.refresh_token,  # type: ignore
                expires_at=token.expires_at,  # type: ignore
                platform=token.linked_account.platform,
                platform_user_id=token.linked_account.platform_user_id,
            )
            for token in tokens
        ]


@broker.subscriber(auth_user_donatex_tokens_refreshed, exchange=main_exchange)
async def donatex_refresh_tokens(
    message: RabbitMessage = Context(),
):
    await message.ack()
    event: DonateXTokenRefreshed = DonateXTokenRefreshed.model_validate_json(message.body)
    async with async_session_maker() as session:
        try:
            link = await linked_accounts_repository.get_by_id_platform(
                session, str(event.platform_user_id), IntegrationPlatform.DONATEX
            )
        except NotFoundException:
            # TODO: log
            return
        tokens = await token_vault_repository.get_by_id_link(session, link.id)

        if not link:
            return
        tokens.access_token = event.access_token
        tokens.refresh_token = event.refresh_token
        tokens.expires_at = event.expires_at
        await token_vault_repository.update(session, tokens)


@broker.subscriber("donatex.user.token.died", exchange=main_exchange)
async def user_token_died(
    message: RabbitMessage = Context(),
):
    await message.ack()
    event: dict = json.loads(message.body)
    async with async_session_maker() as session:
        from src.services.auth.auth_service import auth_service

        await auth_service.bot_was_disconnected(session, IntegrationPlatform.DONATEX, event["platform_user_id"])
