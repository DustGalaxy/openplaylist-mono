# Backend Architecture

## 1. Architecture Overview

### System Design

- Async Python backend for OpenPlaylist.
- Modular monolith with layered boundaries:
  - Transport adapters: `src/adapters/_fastapi`, `src/adapters/_sio`, `src/adapters/_rabbit`, `src/adapters/_redis`.
  - Application/domain services: `src/services`, `src/services_low`.
  - Persistence boundary: `src/dal/postgres`, `src/dal/_redis`.
  - Data contracts: `src/dto`, `src/models`.
  - ORM schema: `src/orm`.
  - Background jobs: `src/tasks`.
- Architectural style: service-oriented layered monolith; ports/adapters naming; repository-backed domain services.

### Tech Stack

- Python: `>=3.13`; Docker app/worker image `python:3.13.6-alpine3.22`; scheduler image `python:3.13.7-alpine3.21`.
- Web framework: FastAPI `>=0.136.1`.
- ASGI server: Uvicorn `>=0.34.2`.
- Realtime: `python-socketio>=5.16.0`, mounted at `/api/socket.io`.
- Database: PostgreSQL 14 in compose; async SQLAlchemy `>=2.0.40`; asyncpg `>=0.30.0`.
- Migrations: Alembic `>=1.17.2`.
- Cache/state: Redis `>=7.1.0`; compose image `redis:alpine`.
- Message broker: RabbitMQ `4.1.2-management`; FastStream Rabbit `>=0.5.48`.
- Task queue: Taskiq `>=0.12.1`; Taskiq Redis `>=1.2.1`.
- Validation/settings: Pydantic `>=2.11.3`; Pydantic Settings `>=2.9.1`.
- Auth crypto: PyJWT `>=2.10.1`; Argon2 `argon2-cffi>=25.1.0`; `cryptography>=45.0.5`.
- External clients: HTTPX, Google API client, pytubefix, isodate.
- Package manager/runtime: `uv`, lockfile `uv.lock`.

### Data Flow

- HTTP lifecycle:
  - Client calls `/api/*`.
  - `main.py` routes through FastAPI `api_route = APIRouter(prefix="/api")`.
  - Route module validates request DTOs.
  - FastAPI dependencies inject `AsyncSession`, current user, and services.
  - Services execute business rules and call repositories.
  - Repositories persist through async SQLAlchemy sessions.
  - Pydantic models serialize responses.
- Realtime lifecycle:
  - Socket.IO ASGI app wraps FastAPI: `socketio.ASGIApp(..., other_asgi_app=app, socketio_path="/api/socket.io")`.
  - Namespaces: `/`, `/widget`, `/plst_upds`.
  - Redis tracks Socket.IO room/session state via `RoomManager`.
- Event/task lifecycle:
  - App lifespan starts RabbitMQ broker, declares queues/exchanges, connects Redis, starts realtime room manager.
  - Domain operations enqueue Taskiq jobs for playlist, order, email, token, and playback work.
  - Taskiq workers use Redis DB `/2` for queue/result backend.
  - RabbitMQ handles bot/auth/playlist integration messages through durable queues and direct/topic exchanges.

## 2. Entry Points & Configuration

### Application Bootstrapping

- `main.py`
  - Creates `FastAPI(lifespan=lifespan)`.
  - Starts/stops RabbitMQ and Redis in lifespan.
  - Registers Socket.IO namespaces.
  - Configures CORS origins for local dev, admin Socket.IO, and `openplaylist.localhost`.
  - Includes route modules under `/api`.
  - Exposes `/health`.
  - Local executable target: `uvicorn main:sio_asgi_app`.
- `taskiq_broker.py`
  - Creates Redis-backed Taskiq broker and result backend.
  - Starts RabbitMQ/Redis/Socket.IO manager in task middleware.
  - Defines `TaskiqScheduler` with label schedule source.
- Docker entrypoints:
  - API: `uv run --no-dev uvicorn main:sio_asgi_app --host 0.0.0.0 --port 8000 --workers 2`.
  - Worker: `uv run --no-dev taskiq worker taskiq_broker:task_broker src.tasks.order src.tasks.playlist src.tasks.email src.tasks.tokens src.tasks.playback`.
  - Scheduler: `uv run --no-dev taskiq scheduler taskiq_broker:scheduler src.tasks.tokens`.

### Environment Management

- Config class: `src/settings.py::Settings`.
- Mechanism: `pydantic_settings.BaseSettings`.
- Env file: `.env`, UTF-8, loaded by `SettingsConfigDict(env_file=".env")`.
- Runtime mode:
  - `MODE=dev|prod`.
  - `MODE=prod` hardcodes `PROJECT_DOMAIN=https://openplaylist.midnull.space`.
- Derived URLs:
  - `EMAIL_COMFIRM_ADRESS={PROJECT_DOMAIN}/email-confirm`.
  - OAuth redirect URI for Twitch, DonationAlerts, Google, Donatex: `{PROJECT_DOMAIN}/oauth-callback`.
- Critical variables:
  - Runtime: `MODE`, `PROJECT_DOMAIN`, `SELF_HOST`, `SELF_PORT`, `SELF_LOG_LEVEL`, `SELF_RELOAD`, `IS_TESTING`.
  - Auth/session: `COOKIE_NAME`, `SESSION_LIVE_TIME`, `JWT_SECRET_KEY`, `JWT_PUBLIC_KEY`, `JWT_ALGORITHM`, `JWT_ISSUER`.
  - Data/infrastructure: `DB_URL`, `RABBITMQ_URL`, `REDIS_URL`.
  - Integrations: `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`, `DA_APP_ID`, `DA_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `DONATEX_CLIENT_ID`, `DONATEX_CLIENT_SECRET`, `YOUTUBE_API_KEY`.
  - Email: `SMTP_EMAIL_ADDRESS`, `SMTP_EMAIL_PASSWORD`, `SMTP_PORT`, `SMTP_SERVER`.

## 3. Core Modules & Domain Logic

### Directory Layout

- `main.py`: ASGI composition, FastAPI setup, Socket.IO mount, lifespan orchestration.
- `src/settings.py`: environment-backed application configuration.
- `src/database.py`: async SQLAlchemy engine/session, declarative base, UUID/timestamp mixins.
- `src/adapters/_fastapi`: REST route adapters.
- `src/adapters/_sio`: Socket.IO initialization and namespace routes.
- `src/adapters/_rabbit`: RabbitMQ broker, queues, exchanges, handlers.
- `src/adapters/_redis`: Redis adapter implementation.
- `src/dal/postgres`: repository classes for PostgreSQL-backed aggregates.
- `src/dal/_redis`: Redis broker singleton.
- `src/services`: primary business services.
- `src/services_low`: lower-level playlist/settings services.
- `src/services/auth`: auth, OAuth strategy manager, platform-specific auth services.
- `src/services/tokens`: token refresh/update management.
- `src/services/realtime`: Socket.IO room, widget, and playlist realtime services.
- `src/orm`: SQLAlchemy table mappings.
- `src/models`: Pydantic domain schemas/create/update models.
- `src/dto`: HTTP/internal DTOs.
- `src/tasks`: Taskiq task definitions.
- `alembic`: migration environment and versions.
- `tests`: pytest unit tests for auth, bots, order, playlist, tasks.

### Business Logic Location

- Auth rules: `src/services/auth/auth_service.py`.
  - Classic login/register.
  - Email confirmation.
  - Social login.
  - Integration linking/unlinking.
  - Bot connect/disconnect/settings.
  - JWT issue/verify.
- OAuth platform behavior: `src/services/auth/*_service.py`, `src/services/auth/strategy_manager.py`.
- Playlist/order/playback rules: `src/services/playlist_service.py`, `src/services/order_service.py`, `src/services/playback_service.py`.
- Realtime side effects: `src/services/realtime/*`.
- Token lifecycle: `src/services/tokens/token_service.py`, `src/services/tokens/manager.py`, `src/services/tokens/strategies`.
- Async side effects: `src/tasks/*`.
- Persistence access: repositories in `src/dal/postgres`, not route modules.

### Data Models

- ORM layer:
  - Base class: `src.database.Base`.
  - Common mixins: `UUIDMixin` with UUIDv7 primary key; `TimestampMixin` with `created_at`, `updated_at`.
  - Tables: users, linked accounts, token vault, stream tokens, playlists, orders, settings, playlist logs.
  - PostgreSQL JSON/array usage: JSONB for user social links; ARRAY fields in settings.
- Validation/serialization:
  - Pydantic models in `src/models`.
  - `ConfigDict(from_attributes=True)` for ORM-to-schema conversion.
  - DTOs in `src/dto` for HTTP payloads and internal third-party API contracts.
- Repository pattern:
  - PostgreSQL repositories in `src/dal/postgres`.
  - Built on async SQLAlchemy and `simple-repo-asyncsqla`.

## 4. API & Integration Contracts

### Exposed Interfaces

- REST base prefix: `/api`.
- Healthcheck: `GET /health`.
- Route groups:
  - `/api/login`: classic login/register, email confirmation, social login, account merge resolution.
  - `/api/user`: current user, integrations, bot connection/settings, user deletion.
  - `/api/playlist`: CRUD, current user playlists, public playlist, logs, base info, play-now, track deletion.
  - `/api/settings`: playlist settings, content rules, donation rules, chat rules, blocklist.
  - `/api/order`: playlist order operations.
  - `/api/stream`: stream token generation.
  - `/api/playback`: pause, seek, position, state.
  - `/api/logout`: auth cookie deletion.
- Realtime:
  - Socket.IO path: `/api/socket.io`.
  - Namespaces: `/`, `/widget`, `/plst_upds`.

### Authentication & AuthZ

- Session transport: HTTP-only secure cookie; name from `COOKIE_NAME` default `auth`.
- JWT:
  - Issued by `AuthService.encode_jwt`.
  - Claims: `sub`, `username`, `exp`, `iat`, `iss`.
  - Signing key: `JWT_SECRET_KEY`.
  - Verification key: `JWT_PUBLIC_KEY`.
  - Algorithm default: `RS256`.
- Password hashing: Argon2 `PasswordHasher`.
- Auth dependency:
  - `APIKeyCookie(name=settings.COOKIE_NAME)`.
  - `CURR_USER = Depends(auth_service.get_current_user)`.
  - `USER_ID = Depends(auth_service.get_current_user_id)`.
- AuthZ:
  - Route/service checks based on current user ownership.
  - Example: playlist settings access joins `Settings` to `Playlist` and validates `Playlist.owner_id == current_user.id`.
- OAuth/social auth:
  - Platforms: Twitch, DonationAlerts, Donatex, Google/YouTube-related integration paths.
  - Flow types represented by `AuthFlow`: auth code, PKCE, user key.

### External Integrations

- Twitch OAuth/API.
- DonationAlerts OAuth/API and Centrifugo websocket URL.
- Donatex API.
- Google OAuth/API client.
- YouTube API and pytubefix fallback/use.
- SMTP email delivery.
- RabbitMQ-integrated bot services:
  - Twitch bot.
  - DonationAlerts bot.
  - Donatex bot.
  - DonatePay bot present in monorepo compose context.

## 5. Data Persistence & State

### Database Migrations

- Tool: Alembic.
- Config: `alembic.ini`.
- Migration env: `alembic/env.py`.
- Database URL source:
  - Alembic overwrites `sqlalchemy.url` from `DB_URL`.
  - Runtime SQLAlchemy engine also uses `settings.DB_URL`.
- Migration metadata:
  - `target_metadata = Base.metadata`.
  - Alembic env imports all ORM modules before autogenerate.
- Execution workflow:
  - Apply: `uv run alembic upgrade head`.
  - Create revision: `uv run alembic revision --autogenerate -m "<message>"`.
  - Inspect history: `uv run alembic history`.

### Caching Strategy

- Redis DB `/0`:
  - General app state.
  - Email confirmation sessions.
  - Pending social account link sessions.
  - Socket.IO room/session indexes.
  - Playlist settings snapshots in task handlers.
- Redis DB `/2`:
  - Taskiq queue and result backend.
- Redis DB `/99`:
  - Test broker fixture.
- Expiration policy:
  - Email confirmation: `ex=600`.
  - Pending link session: `ex=600`.
- Invalidation:
  - One-shot confirmation/link data uses `getdel`.
  - Room state is updated through transactional Redis pipelines in realtime services.

## 6. Development & Deployment Operational Flow

### Local Setup

- Install dependencies:
  - `uv sync`
- Run API:
  - `uv run uvicorn main:sio_asgi_app --host 0.0.0.0 --port 8000 --reload`
- Run worker:
  - `uv run taskiq worker taskiq_broker:task_broker src.tasks.order src.tasks.playlist src.tasks.email src.tasks.tokens src.tasks.playback`
- Run scheduler:
  - `uv run taskiq scheduler taskiq_broker:scheduler src.tasks.tokens`
- Run tests:
  - `uv run pytest`
- Test config:
  - `pytest.ini` sets `pythonpath = src`, `asyncio_mode = auto`, `testpaths = tests`, `IS_TESTING=True`.
- Type checking:
  - `pyproject.toml` configures `basedpyright`.
  - Command: `uv run basedpyright` if installed in the active environment.
- Formatting/linting:
  - No Ruff, Black, or MyPy dependency/config declared in `pyproject.toml`.

### CI/CD & Deployment

- CI configuration: not present in inspected backend/root files.
- Containerization:
  - API: `back-end/Dockerfile`.
  - Task worker: `back-end/Dockerfile.tasks`.
  - Task scheduler: `back-end/Dockerfile.scheduler`.
  - All use `uv sync --frozen --no-cache --no-dev`.
- Compose services:
  - `backend`: FastAPI/Socket.IO app on port `8000`; healthcheck `GET /health`.
  - `task-worker`: Taskiq worker for order, playlist, email, tokens, playback.
  - `task-schuduler`: Taskiq scheduler for token tasks.
  - `database`: PostgreSQL 14; initialized by root `init.sql`.
  - `redis`: append-only Redis.
  - `rabbitmq`: RabbitMQ with management UI.
  - `caddy`: ingress proxy.
  - Bot services: `bot-ttv`, `bot-donatex`, `bot-da`.
  - Frontend: `new_ui`.
- Ingress:
  - Root `Caddyfile`.
  - `/api*` reverse-proxies to `backend:8000`.
  - All other paths reverse-proxy to `frontend:80`.
- Deployment target:
  - Docker Compose stack with Caddy, backend, workers, scheduler, PostgreSQL, Redis, RabbitMQ, frontend, bot services.
