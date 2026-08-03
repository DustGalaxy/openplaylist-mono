from pathlib import Path

from fastapi import FastAPI
from sqladmin import Admin
from starlette.requests import Request
from starlette.responses import RedirectResponse, Response, JSONResponse
from starlette.routing import Route

from src.adapters.admin.auth import authentication_backend
from src.adapters.admin.custom_views.tasks import TasksSchedulerAdmin
from src.adapters.admin.custom_views.twitch import TwitchAuthAdmin
from src.adapters.admin.views import (
    BanlistAdmin,
    FeatureFlagAdmin,
    LinkedAccountsAdmin,
    TwitchAdminTokenAdmin,
    UserAdmin,
    UserRoleAdmin,
)
from src.database import engine

TEMPLATES_DIR = Path(__file__).parent / "templates"


def setup_admin(app: FastAPI) -> Admin:
    admin = Admin(
        app=app,
        base_url="/api/admin",
        engine=engine,
        authentication_backend=authentication_backend,
        templates_dir=str(TEMPLATES_DIR),
    )

    async def stealth_login_route(request: Request) -> Response:
        if request.method != "POST":
            return JSONResponse({"detail": "Not Found"}, status_code=404)

        result = await admin.authentication_backend.login(request)
        if isinstance(result, Response):
            return result

        if not result:
            return JSONResponse({"detail": "Not Found"}, status_code=404)

        is_json = (
            "application/json" in request.headers.get("accept", "")
            or "application/json" in request.headers.get("content-type", "")
            or request.headers.get("x-requested-with") == "XMLHttpRequest"
        )
        if is_json:
            return JSONResponse({"status": "ok"}, media_type="application/json", status_code=200)

        return RedirectResponse(request.url_for("admin:index"), status_code=303)

    for i, route in enumerate(admin.admin.routes):
        if getattr(route, "path", None) == "/login":
            admin.admin.routes[i] = Route(
                "/login",
                endpoint=stealth_login_route,
                methods=["GET", "POST"],
                name="login",
            )

    admin.add_view(UserAdmin)
    admin.add_view(UserRoleAdmin)
    admin.add_view(BanlistAdmin)
    admin.add_view(LinkedAccountsAdmin)
    admin.add_view(FeatureFlagAdmin)
    admin.add_view(TwitchAdminTokenAdmin)
    admin.add_view(TwitchAuthAdmin)
    admin.add_view(TasksSchedulerAdmin)
    return admin
