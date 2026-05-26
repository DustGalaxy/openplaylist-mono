# OpenPlaylist — Project Description

This document describes the **OpenPlaylist** platform as implemented by the `back-end/` and `new_ui/` packages. Together they form a collaborative music-playlist system where streamers and viewers can build, manage, and interact with shared queues in real time.

---

## What the project does

OpenPlaylist lets a user (typically a streamer) create one or more **playlists** and accept **track requests** from an audience. Each playlist has rich **settings** that control validation, ordering, donations, chat roles, and blocking. The owner manages playback from a dashboard; viewers can discover public playlists and submit songs through the web UI or external integrations handled by the backend.

The product goal is to make playlists **shared and interactive** rather than a static personal list: requests arrive asynchronously, rules decide whether they are accepted, priority affects queue order, and all connected clients see changes live.

---

## High-level architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        new_ui/ (React)                      │
│  TanStack Router · React Query · Zustand · Socket.IO client │
└───────────────┬──────────────────────────┬──────────────────┘
                │ REST (cookie auth)        │ WebSocket
                ▼                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     back-end/ (FastAPI)                     │
│  /api/login · /api/user · /api/playlist · /api/order        │
│  /api/settings · /api/socket.io                             │
└───────┬──────────────┬──────────────┬───────────────────────┘
        │              │              │
        ▼              ▼              ▼
   PostgreSQL       Redis         RabbitMQ + TaskIQ
   (primary DB)   (sessions,      (async events &
                   cache)          background tasks)
```

| Layer | Role |
|-------|------|
| **new_ui** | Browser client: auth, dashboard, public views, settings UI, optimistic updates |
| **back-end** | API, business logic, persistence, realtime broadcast, async processing |
| **PostgreSQL** | Users, playlists, orders (tracks), settings and related rules |
| **Redis** | Session/link data, Socket.IO user mapping, TaskIQ broker |
| **RabbitMQ** | Cross-service events (e.g. platform bot integrations) |

---

## Core domain concepts

### Playlist

A playlist belongs to an owner and contains metadata (name, description, visibility, tags, allowed sources). It tracks the **currently playing** track and links to a one-to-one **Settings** record. Tracks in the queue are represented as **Orders** associated with the playlist.

**Modes:**
- `flow` — after a track finishes, it leaves the queue (continuous stream-style playback)
- `static` — tracks remain in the list unless explicitly removed

### Order (track request)

An order is a requested piece of content (typically a YouTube video). It stores metadata captured at request time (title, duration, views, likes, priority, requester nickname, source platform). Orders move through statuses such as `in playlist`, `listened`, `removed`, and `skipped`.

New requests from the web UI are submitted to `POST /api/order/new` and processed asynchronously via TaskIQ.

### Settings

Each playlist has a settings document that drives behavior:

| Area | Purpose |
|------|---------|
| **General** | Max size, playback mode, repeat mode, sort preferences, cost mode |
| **Content settings** | Per-platform validation (min views/likes, max duration, cooldowns) |
| **Donation rules** | Priority boosts tied to donation amounts and platforms |
| **Chat rules** | Role-based permissions from chat platforms (Twitch, YouTube) |
| **Block list** | Block users by platform ID or username |

The backend exposes full CRUD for settings and nested rule types under `/api/settings/{playlist_id}/…`.

### Real-time updates

Clients connect to Socket.IO at `/api/socket.io` and subscribe to a playlist room on the `/plst_upds` namespace. Events include track added, track removed, play-now changes, and settings updates. The frontend Zustand store merges server events with optimistic local actions.

---

## back-end/

Python **FastAPI** service (Python 3.13+) organized in layers: adapters → services → DAL → ORM/models.

### Entry point

`src/main.py` bootstraps:

- FastAPI app with CORS for local and production origins
- REST routers under `/api`
- Socket.IO mounted at `/api/socket.io`
- Lifespan hooks for RabbitMQ broker, Redis, and room manager startup/shutdown

### API surface

| Prefix | Module | Responsibility |
|--------|--------|----------------|
| `/api/login` | `login_routes.py` | Classic login/register, email confirmation, social OAuth, account merge |
| `/api/user` | `user_routes.py` | Current user profile, integrations, bot connection |
| `/api/playlist` | `playlist_routes.py` | CRUD, search, public view, play-now, track removal |
| `/api/order` | `order_routes.py` | Submit new track requests |
| `/api/settings` | `settings_routes.py` | Playlist settings and nested rules (content, donation, chat, block list) |

Authentication uses an **HTTP-only cookie** (`auth`) containing a JWT. Protected routes resolve the current user via `CURR_USER` dependency.

### Authentication

Supported flows:

1. **Classic** — email/password registration with email confirmation (pending data stored in Redis)
2. **Social OAuth** — Twitch, DonationAlerts (DA), and other platforms via a strategy manager
3. **Account linking** — when a social login email collides with an existing account, the API returns `202 NEED_CONFIRMATION` and the client resolves the merge

`AuthService` handles password hashing (Argon2), JWT encoding/decoding, linked account storage, and token vault access for platform APIs.

### Playlist & order processing

- **PlaylistService** — create/patch/delete playlists, search, public access, play-now, track lifecycle
- **OrderService** — validates and persists incoming requests (often triggered from TaskIQ workers)
- Track additions and removals **kick background tasks** (`playlist.track.playnow`, `playlist.track.deleted`, `order.new`) that eventually broadcast Socket.IO events to subscribed clients

### Settings service

`SettingsService` (via `services_low/settings.py`) manages the main settings record and nested entities:

- Content validation rules per platform
- Donation tier definitions
- Chat role rules with reorder support
- Block list entries (by `USER_ID` or `USER_NAME`)

Routes enforce ownership through the `SETTINGS` dependency, which loads settings for the requested playlist only if the caller is authorized.

### Real-time layer (Socket.IO)

Two namespaces in `adapters/_sio/routes.py`:

| Namespace | Purpose |
|-----------|---------|
| `/` (`BasicNamespace`) | General authenticated connection; stores user session in Redis |
| `/plst_upds` (`PlstUpdsNamespace`) | Playlist subscriptions; clients emit `subscribe` / `unsubscribe` with `playlist_id` |

JWT is read from the auth cookie on connect. `sio_service` and `room_manager` route events to the correct playlist rooms.

Typical server → client events (per playlist):

- `add_track:{playlist_id}`
- `delete_track:{playlist_id}`
- `playnow:{playlist_id}`
- `settings_changed:{playlist_id}`

### Async infrastructure

| Component | Use |
|-----------|-----|
| **RabbitMQ + FastStream** | Event broker for external platform handlers |
| **TaskIQ + Redis** | Background jobs for orders, playlist side effects, email |
| **Redis broker** | Ephemeral data: email confirmation, OAuth link sessions, Socket.IO sid mapping |

### Data layer

- **ORM** (`orm/`) — SQLAlchemy async models
- **Models** (`models/`) — Pydantic schemas for API input/output and patches
- **DTO** (`dto/`) — HTTP and internal transfer objects
- **DAL** (`dal/postgres_impl.py`) — repository implementations on top of `simple-repo-asyncsqla`
- **Alembic** — database migrations

### Project layout (back-end)

```
back-end/
├── src/
│   ├── main.py                 # App entry, router registration, Socket.IO
│   ├── settings.py             # Environment configuration
│   ├── database.py             # Async SQLAlchemy session
│   ├── adapters/
│   │   ├── _fastapi/           # REST route handlers + dependencies
│   │   ├── _sio/               # Socket.IO namespaces
│   │   ├── _rabbit/            # RabbitMQ broker and event handlers
│   │   └── _redis/             # Redis client
│   ├── services/               # Auth, playlist, order, tokens, Socket.IO
│   ├── services_low/           # Lower-level playlist/settings helpers
│   ├── tasks/                  # TaskIQ task definitions
│   ├── models/                 # Pydantic domain models
│   ├── orm/                    # SQLAlchemy table definitions
│   ├── dto/                    # Request/response DTOs
│   └── dal/                    # Data access repositories
├── alembic/                    # Migrations
├── tests/                      # Unit and integration tests
├── pyproject.toml
└── Dockerfile
```

### Running locally

```bash
cd back-end
# install deps (uv/pip per project setup)
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

Requires PostgreSQL, Redis, and RabbitMQ (typically via Docker Compose at the monorepo root).

---

## new_ui/

Modern **React 19 + TypeScript** SPA built with **Vite**, served on port 3000 in development.

### Stack

| Technology | Role |
|------------|------|
| **TanStack Router** | File-based routing (`src/routes/`) |
| **TanStack Query** | Server state, auth profile fetching |
| **Zustand** | Client state: auth session, playlist queue, socket sync |
| **Axios** | HTTP client with credentials |
| **Socket.IO client** | Real-time playlist updates |
| **Tailwind CSS v4 + Radix UI** | Styling and accessible components |
| **@dnd-kit** | Drag-and-drop where needed |
| **react-youtube** | Embedded playback |

### Configuration

Runtime config is injected via Vite env vars and exposed on `window.appConfig` in `main.tsx`:

- `VITE_AUTH_API_URL`, `VITE_PLST_API_URL`, `VITE_ORDER_API_URL`
- `VITE_WS_API_URL`, `VITE_SOCKET_PATH`
- OAuth client IDs and redirect URIs for Twitch and DA

### Routes

| Route | Purpose |
|-------|---------|
| `/` | Landing page |
| `/login`, `/register` | Authentication |
| `/oauth-callback` | OAuth code exchange |
| `/email-confirm` | Email verification |
| `/dashboard` | Owner playlist management (protected) |
| `/view?p={id}` | Public playlist viewer |
| `/settings` | User settings |
| `/history`, `/statistic` | Additional views |
| `/logout` | Session teardown |

### Feature modules

Organized under `src/features/`:

```
features/
├── auth/              Login, register, social auth buttons, OAuth hooks
├── playlist/          Dashboard UI: queue, player, order cards, new playlist
├── public-playlist/   Public discovery and viewer components
├── settings/          Playlist settings modal (tabs below)
└── user-settings/     Account-level preferences
```

**Playlist settings modal** (`features/settings/components/playlist-settings/`) tabs:

- **Basic** — name, description, visibility, sources
- **Validation** — content rules per platform
- **Donation** — donation priority tiers
- **Chat Roles** — platform chat permissions
- **Block** — block list management
- **Delete** — destructive playlist removal

Changes auto-save via debounced PATCH requests (2 s delay).

### State management

**authStore** (Zustand + localStorage)

- Holds user profile and session expiry
- `useCurrentUserQuery` validates session against `GET /api/user/me`
- Social login uses a **strategy registry** (`lib/authStrategyRegistry.ts`, `lib/strategies/`) so Twitch and DA share one generic OAuth flow

**musicStore** (Zustand)

- Source of truth for loaded playlists on the dashboard
- Optimistic API calls for add/remove/play-now
- Socket handlers reconcile server broadcasts:
  - `syncAddTrack`, `syncRemoveTrack`, `syncPlayNow`, `syncPlSettings`
- Manages subscribe/unsubscribe lifecycle per playlist
- Implements local playback navigation (`playNext`, `playPrev`) respecting repeat mode and flow/static mode

### API client

`src/api/api-playlist.ts` centralizes backend calls:

- Playlist CRUD and search
- Settings PATCH
- Order submission (`POST /api/order/new`)
- Play-now, track removal, block list CRUD

All authenticated requests use `withCredentials: true` for cookie-based auth.

### Real-time client

`src/api/io-sockets.ts` and `src/hooks/usePlstUpdates.tsx` establish the Socket.IO connection to `/plst_upds`. The dashboard registers handlers per playlist and emits `subscribe` when a playlist tab is active.

### Project layout (new_ui)

```
new_ui/
├── src/
│   ├── main.tsx                # App bootstrap, env config, router
│   ├── routes/                 # TanStack file routes
│   ├── features/               # Feature-owned UI (auth, playlist, settings, …)
│   ├── components/
│   │   ├── ui/                 # Shared primitives (shadcn-style)
│   │   ├── icons/              # SVG icon components
│   │   └── layout/             # Header, navigation
│   ├── api/                    # HTTP and socket clients
│   ├── hooks/                  # useAuth, usePlstUpdates, …
│   ├── stores/                 # authStore, musicStore, savedStore
│   ├── lib/                    # Utils, auth strategies, constants
│   ├── types/                  # Shared TypeScript types
│   └── integrations/           # TanStack Query provider setup
├── public/                     # Static assets
├── docs/PROJECT_STRUCTURE.md  # Frontend folder conventions
├── package.json
├── vite.config.ts
└── Dockerfile
```

### Running locally

```bash
cd new_ui
npm install
npm run dev   # http://localhost:3000
```

Point env vars at a running backend instance (default `http://localhost:8000`).

---

## End-to-end flows

### 1. User signs in

```
Browser → POST /api/login/classic (or /api/login/social/{type})
       ← Set-Cookie: auth=<JWT>
Browser → GET /api/user/me
       ← { user, expired_at }
new_ui stores profile in authStore, redirects to /dashboard
```

### 2. Owner creates and configures a playlist

```
Dashboard → POST /api/playlist { name, description }
         ← playlist + default settings
Settings modal → PATCH /api/settings/{id} (debounced)
              → PATCH /api/playlist/{id} for metadata
```

### 3. Viewer requests a track

```
Viewer → POST /api/order/new { playlist_id, yt_video_url, … }
TaskIQ worker validates against settings (views, duration, block list, cooldowns)
On success → track persisted → Socket.IO add_track event
Dashboard & public view update queue via musicStore.syncAddTrack
```

### 4. Owner skips or plays a track

```
Dashboard → PATCH /api/playlist/{id}/playnow { track_id }
         or DELETE /api/playlist/{id}/track/{track_id}
Backend updates state → kicks task → broadcasts playnow / delete_track
Connected clients update now_playing and queue order
```

### 5. Public playlist viewing

```
/view?p={uuid} → GET /api/playlist/{id}/public (no auth required if public)
Socket subscribe for live queue updates
Embedded YouTube player follows now_playing
```

---

## Design principles

**Backend**

- Async-first I/O (SQLAlchemy async, async route handlers)
- Clear separation: routes → services → repositories
- Events for side effects that should not block HTTP responses
- Pydantic validation at API boundaries

**Frontend**

- Routes stay thin; feature logic lives in `features/`
- Server data via React Query; live queue via Zustand + sockets
- Shared UI only in `components/ui`, `icons`, and `layout`
- OAuth extensibility through the auth strategy pattern

---

## Related documentation

| Document | Contents |
|----------|----------|
| [PROJECT_GUIDE.md](../PROJECT_GUIDE.md) | Full monorepo guide including infrastructure and database schema |
| [new_ui/docs/PROJECT_STRUCTURE.md](../new_ui/docs/PROJECT_STRUCTURE.md) | Frontend folder conventions |
| [new_ui/src/lib/strategies/STRATEGY_GUIDE.md](../new_ui/src/lib/strategies/STRATEGY_GUIDE.md) | Adding new OAuth providers |
| [back-end/tests/TESTING_GUIDE.md](../back-end/tests/TESTING_GUIDE.md) | Backend test practices |

---

*Last updated: May 2026*
