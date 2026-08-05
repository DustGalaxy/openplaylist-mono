import pytest
from argon2 import PasswordHasher
from fastapi import FastAPI
from starlette.testclient import TestClient

from src.adapters.admin.auth import AdminAuth
from src.adapters.admin.setup import setup_admin
from src.settings import settings


def test_admin_stealth_auth_success_and_failures(monkeypatch):
    ph = PasswordHasher()
    raw_pass = "TestAdminPassword123!"
    pass_hash = ph.hash(raw_pass)

    monkeypatch.setattr(settings, "ADMIN_PASSWORD_HASH", pass_hash)

    app = FastAPI()
    setup_admin(app)
    client = TestClient(app, follow_redirects=False)

    # 1. Unauthenticated GET /api/admin/ -> 404 Not Found
    res_unauth = client.get("/api/admin/")
    assert res_unauth.status_code == 404

    # 2. Probe GET /api/admin/login -> 404 Not Found
    res_get_login = client.get("/api/admin/login")
    assert res_get_login.status_code == 404

    # 3. POST /api/admin/login with incorrect password -> 404 Not Found
    res_wrong_pass = client.post("/api/admin/login", data={"password": "WrongPassword"})
    assert res_wrong_pass.status_code == 404

    # 4. POST /api/admin/login with correct password -> 200 OK (JSON) & admin_session cookie set
    res_correct_pass = client.post(
        "/api/admin/login",
        json={"password": raw_pass},
        headers={"accept": "application/json"},
    )
    assert res_correct_pass.status_code == 200
    assert "admin_session" in res_correct_pass.cookies

    # 5. Authenticated GET /api/admin/ -> 200 OK
    res_auth_page = client.get("/api/admin/", cookies=res_correct_pass.cookies)
    assert res_auth_page.status_code == 200
