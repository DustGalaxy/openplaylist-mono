from datetime import UTC
from typing import Any
from urllib.parse import urlencode

from fastapi import HTTPException, Request
from fastapi.responses import RedirectResponse, Response
from sqladmin import BaseView, expose

from src.services.auth.twitch_service import auth_twitch_service
from src.settings import settings

AVAILABLE_TWITCH_SCOPES: list[dict[str, str]] = [
    {
        "name": "user:read:email",
        "description": "Read authorized user's email address",
        "category": "User",
    },
    {
        "name": "user:bot",
        "description": "Join a specified chat channel as your user and appear as a bot, and perform chat-related actions as your user.",
        "category": "Bot",
    },
    {
        "name": "user:read:chat",
        "description": "Receive and view live chat messages on channels where the bot is present.",
        "category": "Bot",
    },
    {
        "name": "user:write:chat",
        "description": "Send live chat messages on channels where the bot is authorized.",
        "category": "Bot",
    },
    {
        "name": "channel:bot",
        "description": "Joins your channel’s chatroom as a bot user, and perform chat-related actions as that user.",
        "category": "Channel",
    },
    {
        "name": "channel:read:subscriptions",
        "description": "View a list of all subscribers to a channel and check if a user is subscribed to a channel.",
        "category": "Channel",
    },
    {
        "name": "channel:read:vips",
        "description": "Read the list of VIPs in your channel.",
        "category": "Channel",
    },
    {
        "name": "chat:read",
        "description": "Read chat messages in channel (Legacy)",
        "category": "Chat",
    },
    {
        "name": "chat:edit",
        "description": "Send chat messages in channel (Legacy)",
        "category": "Chat",
    },
    {
        "name": "moderator:read:followers",
        "description": "Read channel followers list",
        "category": "Moderation",
    },
    {
        "name": "bits:read",
        "description": "View Cheermotes and Bits information",
        "category": "Bits",
    },
    {
        "name": "channel:read:redemptions",
        "description": "View Channel Points Custom Rewards and redemptions",
        "category": "Channel Points",
    },
    {
        "name": "channel:manage:redemptions",
        "description": "Create, update, and manage Channel Points Custom Rewards and redemptions",
        "category": "Channel Points",
    },
]


class TwitchAuthAdmin(BaseView):
    """SQLAdmin BaseView providing Twitch OAuth authorization flow and callback handler."""

    name = "Twitch OAuth"
    icon = "fa-brands fa-twitch"

    @expose("/twitch_auth", methods=["GET", "POST"])
    async def twitch_auth(self, request: Request) -> Response:
        default_scopes = settings.TWITCH_ADMIN_DEFAULT_SCOPES.split()
        selected_scopes = list(default_scopes)
        custom_scopes_str = ""
        redirect_uri = settings.TWITCH_ADMIN_REDIRECT_URI or settings.TWITCH_REDIRECT_URI
        state = settings.TWITCH_ADMIN_STATE
        generated_url = None

        if request.method == "POST":
            form_data = await request.form()
            posted_scopes = form_data.getlist("scopes")
            custom_scopes_str = str(form_data.get("custom_scopes", "")).strip()
            redirect_uri = str(form_data.get("redirect_uri", redirect_uri)).strip()
            state = str(form_data.get("state", state)).strip()
            action = form_data.get("action", "authorize")

            selected_scopes = [str(s) for s in posted_scopes]
            all_scopes = list(selected_scopes)
            if custom_scopes_str:
                all_scopes.extend(custom_scopes_str.split())

            # Remove duplicates preserving order
            unique_scopes = list(dict.fromkeys(all_scopes))
            scope_param = " ".join(unique_scopes)

            query_params = {
                "client_id": settings.TWITCH_CLIENT_ID,
                "redirect_uri": redirect_uri,
                "response_type": "code",
                "scope": scope_param,
                "state": state,
            }
            twitch_base_url = getattr(settings, "TWITCH_URL", "https://id.twitch.tv")
            auth_url = f"{twitch_base_url}/oauth2/authorize?{urlencode(query_params)}"

            if action == "authorize":
                return RedirectResponse(auth_url, status_code=303)

            generated_url = auth_url

        context: dict[str, Any] = {
            "request": request,
            "client_id": settings.TWITCH_CLIENT_ID,
            "redirect_uri": redirect_uri,
            "state": state,
            "available_scopes": AVAILABLE_TWITCH_SCOPES,
            "selected_scopes": selected_scopes,
            "custom_scopes": custom_scopes_str,
            "generated_url": generated_url,
        }

        return await self.templates.TemplateResponse(request, "twitch_auth.html", context)

    @expose("/twitch-callback", methods=["GET"])
    async def twitch_callback(self, request: Request) -> Response:
        code = request.query_params.get("code")
        error = request.query_params.get("error")
        error_description = request.query_params.get("error_description")
        state = request.query_params.get("state")

        token = None
        user_info = None
        error_message = None
        success = False

        if error:
            error_message = error_description or f"OAuth provider returned error: {error}"
        elif not code:
            error = "MISSING_AUTHORIZATION_CODE"
            error_message = "No authorization code received in query parameters."
        else:
            try:
                redirect_uri = settings.TWITCH_ADMIN_REDIRECT_URI or settings.TWITCH_REDIRECT_URI
                # redirect_uri = "http://localhost:8000/admin/twitch-callback"
                token = auth_twitch_service.get_token(code=code, redirect_uri=redirect_uri)
                success = True

                try:
                    user_info = auth_twitch_service.get_data(access_token=token.access_token)
                except Exception:
                    pass

                try:
                    from datetime import datetime, timedelta

                    from src.database import async_session_maker
                    from src.models.twitch_admin_token import TwitchAdminTokenCreate
                    from src.services.admin.twitch_admin_token_service import twitch_admin_token_service

                    async with async_session_maker() as session:
                        expires_at = datetime.now(UTC) + timedelta(seconds=token.expires_in) if token.expires_in else None
                        create_dto = TwitchAdminTokenCreate(
                            twitch_user_id=str(user_info.id) if user_info and hasattr(user_info, "id") else None,
                            twitch_username=str(user_info.display_name)
                            if user_info and hasattr(user_info, "display_name")
                            else None,
                            twitch_email=str(user_info.email) if user_info and hasattr(user_info, "email") else None,
                            access_token=token.access_token,
                            refresh_token=token.refresh_token,
                            token_type=token.token_type,
                            expires_in=token.expires_in,
                            expires_at=expires_at,
                            scope=token.scope if isinstance(token.scope, list) else [],
                            is_active=True,
                        )
                        saved_token = await twitch_admin_token_service.save_or_update_token(session, create_dto)

                        # Publish to RabbitMQ so bot_ttv connects the token in real-time
                        try:
                            from src.adapters._rabbit.bots.dto import Tokens
                            from src.adapters._rabbit.broker import get_broker
                            from src.adapters._rabbit.queues import main_exchange

                            broker = get_broker()
                            if broker and user_info and hasattr(user_info, "id"):
                                await broker.publish(
                                    Tokens(
                                        user_id=str(saved_token.id),
                                        access_token=saved_token.access_token,
                                        refresh_token=saved_token.refresh_token,
                                        expires_at=int(saved_token.expires_at.timestamp()) if saved_token.expires_at else 0,
                                        platform="twitch",
                                        platform_user_id=str(user_info.id),
                                        bot_settings={"prefix": "!"},
                                    ),
                                    "bot.twitch.connect.request",
                                    main_exchange,
                                )
                        except Exception:
                            pass
                except Exception:
                    pass
            except HTTPException as http_ex:
                error = f"HTTP_{http_ex.status_code}"
                error_message = str(http_ex.detail)
            except Exception as ex:
                error = "TOKEN_EXCHANGE_FAILED"
                error_message = str(ex)

        context: dict[str, Any] = {
            "request": request,
            "success": success,
            "token": token,
            "user_info": user_info,
            "error": error,
            "error_description": error_description,
            "error_message": error_message,
            "state": state,
        }

        return await self.templates.TemplateResponse(request, "twitch_callback.html", context)
