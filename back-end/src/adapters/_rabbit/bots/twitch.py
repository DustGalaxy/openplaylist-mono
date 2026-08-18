from datetime import datetime
from uuid import uuid4

from faststream.rabbit import RabbitRouter
from simple_repository.exceptions import NotFoundException

from src.adapters._rabbit.broker import get_broker
from src.adapters._rabbit.queues import (
    user_fanout_exchange,
    main_exchange,
    auth_user_twitch_all_request,
    bot_twitch_order_new,
    auth_user_twitch_tokens_refreshed,
)
from src.dto.internal.domain_events import InternalUserEvent, InternalUserEventType
from src.dto.order import NewOrderPayload, TTVNewOrder
from src.adapters._rabbit.bots.dto import Tokens, TwitchTokenRefreshed

from src.dal.postgres.token import token_vault_repository
from src.dal.postgres.linked_account import linked_accounts_repository
from src._types import IntegrationPlatform
from src.database import async_session_maker

router = RabbitRouter()


@router.subscriber(bot_twitch_order_new, exchange=main_exchange)
async def order_new_from_twitch(event: TTVNewOrder):

    await get_broker().publish(
        NewOrderPayload(order=event, from_owner=event.owner_platform_id == event.requester_id),
        "order.proccess",
        main_exchange,
    )


@router.subscriber(auth_user_twitch_all_request, exchange=main_exchange)
async def get_all_twitch_users():
    async with async_session_maker() as session:
        from src.services.auth.auth_service import auth_service
        from src.services.admin.twitch_admin_token_service import twitch_admin_token_service

        tokens = await auth_service.get_all_tokens(session, IntegrationPlatform.TWITCH)
        existing_pids = {token.linked_account.platform_user_id for token in tokens}

        result = [
            Tokens(
                user_id=str(token.linked_account.user_id),
                access_token=token.access_token,
                refresh_token=token.refresh_token,  # type: ignore
                expires_at=token.expires_at,  # type: ignore
                platform=token.linked_account.platform,
                platform_user_id=token.linked_account.platform_user_id,
                bot_settings=token.linked_account.bot_settings,
            )
            for token in tokens
        ]

        try:
            admin_tokens = await twitch_admin_token_service.get_active_tokens(session)
            for admin_tok in admin_tokens:
                if admin_tok.twitch_user_id and admin_tok.twitch_user_id not in existing_pids:
                    result.append(
                        Tokens(
                            user_id=str(admin_tok.id),
                            access_token=admin_tok.access_token,
                            refresh_token=admin_tok.refresh_token,
                            expires_at=int(admin_tok.expires_at.timestamp()) if admin_tok.expires_at else 0,
                            platform="twitch",
                            platform_user_id=admin_tok.twitch_user_id,
                            bot_settings={"prefix": "!"},
                        )
                    )
        except Exception:
            pass

        return result


@router.subscriber(auth_user_twitch_tokens_refreshed, exchange=main_exchange)
async def twitch_refresh_tokens(
    event: TwitchTokenRefreshed,
):
    async with async_session_maker() as session:
        try:
            link = await linked_accounts_repository.get_by_id_platform(session, str(event.twitch_id), IntegrationPlatform.TWITCH)
            tokens = await token_vault_repository.get_by_id_link(session, link.id)
            if tokens:
                tokens.access_token = event.access_token
                tokens.refresh_token = event.refresh_token
                tokens.expires_at = event.expires_in + int(datetime.now().timestamp())
                await token_vault_repository.update(session, tokens)
        except NotFoundException:
            try:
                from src.services.admin.twitch_admin_token_service import twitch_admin_token_service
                from src.models.twitch_admin_token import TwitchAdminTokenUpdate
                from datetime import timedelta, UTC

                admin_tok = await twitch_admin_token_service.get_token_by_user_id(session, str(event.twitch_id))
                if admin_tok:
                    expires_at = datetime.now(UTC) + timedelta(seconds=event.expires_in)
                    await twitch_admin_token_service.update_token(
                        session,
                        admin_tok.id,
                        TwitchAdminTokenUpdate(
                            access_token=event.access_token,
                            refresh_token=event.refresh_token,
                            expires_in=event.expires_in,
                            expires_at=expires_at,
                        ),
                    )
            except Exception:
                pass


@router.subscriber("twitch.user.token.died", exchange=main_exchange)
async def user_token_died(
    event: dict,
):
    async with async_session_maker() as session:
        from src.services.auth.auth_service import auth_service

        link = await auth_service.bot_was_disconnected(session, IntegrationPlatform.TWITCH, event["platform_user_id"])

        user = await auth_service.user_repo.get_one(session, link.user_id)

        await get_broker().publish(
            InternalUserEvent(
                event_id=uuid4(),
                event_type=InternalUserEventType.INTEGRATION_DIED,
                user_id=user.id,
                user_name=user.username,
                died_integration=IntegrationPlatform.TWITCH,
            ),
            exchange=user_fanout_exchange,
        )
