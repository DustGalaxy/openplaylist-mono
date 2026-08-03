import hashlib
import logging
from datetime import UTC, datetime, timedelta

import jwt
from argon2 import PasswordHasher
from sqladmin.authentication import AuthenticationBackend
from starlette.requests import Request
from starlette.responses import Response, JSONResponse

from src.settings import settings

logger = logging.getLogger(__name__)

ph = PasswordHasher()


class AdminAuth(AuthenticationBackend):
    """Stealth / Detached SQLAdmin authentication backend powered by Argon2 & RS256 JWT tokens."""

    def __init__(self, secret_key: str):
        super().__init__(
            secret_key=secret_key,
            session_cookie="admin_session",
            max_age=86400,  # 24 hours max session lifetime
            same_site="lax",
            https_only=settings.MODE == "prod",
        )

    @staticmethod
    def _get_hash_signature() -> str:
        """Return SHA-256 signature prefix of current ADMIN_PASSWORD_HASH to invalidate JWTs if password changes."""
        if not settings.ADMIN_PASSWORD_HASH:
            return ""
        clean_hash = settings.ADMIN_PASSWORD_HASH.strip("'\"")
        return hashlib.sha256(clean_hash.encode()).hexdigest()[:16]

    async def login(self, request: Request) -> Response | bool:
        """Verify POST password against settings.ADMIN_PASSWORD_HASH and issue Admin JWT."""
        if not settings.ADMIN_PASSWORD_HASH:
            logger.warning("ADMIN_PASSWORD_HASH is not set in environment settings.")
            return False

        password = ""
        ct = request.headers.get("content-type", "")
        if ct.startswith("application/json"):
            try:
                body = await request.json()
                password = str(body.get("password", "")).strip()
            except Exception:
                pass

        if not password:
            try:
                form = await request.form()
                password = str(form.get("password", "") or form.get("admin_password", "")).strip()
            except Exception:
                pass

        if not password:
            return False

        try:
            target_hash = settings.ADMIN_PASSWORD_HASH.strip("'\"")
            ph.verify(target_hash, password)
            now = datetime.now(UTC)
            payload = {
                "sub": "admin",
                "role": "super_admin",
                "iat": int(now.timestamp()),
                "exp": int((now + timedelta(hours=24)).timestamp()),
                "iss": settings.JWT_ISSUER,
                "pass_sig": self._get_hash_signature(),
            }

            if settings.JWT_ALGORITHM.startswith("RS"):
                token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
            else:
                token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

            request.session.update({"token": token})
            logger.info("Admin stealth JWT authentication successful.")
            return True
        except Exception:
            return False

    async def logout(self, request: Request) -> Response | bool:
        """Clear session on logout and return 404 response."""
        request.session.clear()
        return JSONResponse({"detail": "Not Found"}, status_code=404)

    async def authenticate(self, request: Request) -> Response | bool:
        """Authenticate request for admin pages using RS256 JWT verification."""
        token = request.session.get("token")
        if not token:
            return JSONResponse({"detail": "Not Found"}, status_code=404)

        try:
            if settings.JWT_ALGORITHM.startswith("RS"):
                payload = jwt.decode(
                    token,
                    settings.JWT_PUBLIC_KEY,
                    algorithms=[settings.JWT_ALGORITHM],
                )
            else:
                payload = jwt.decode(
                    token,
                    settings.JWT_SECRET_KEY,
                    algorithms=[settings.JWT_ALGORITHM],
                )

            if payload.get("sub") != "admin" or payload.get("role") != "super_admin":
                request.session.clear()
                return JSONResponse({"detail": "Not Found"}, status_code=404)

            # Invalidate JWT if ADMIN_PASSWORD_HASH has changed in environment
            if payload.get("pass_sig") != self._get_hash_signature():
                request.session.clear()
                return JSONResponse({"detail": "Not Found"}, status_code=404)

            return True
        except Exception:
            request.session.clear()
            return JSONResponse({"detail": "Not Found"}, status_code=404)


authentication_backend = AdminAuth(secret_key=settings.JWT_SECRET_KEY)
