# OpenPlaylist Mono - Complete Project Guide

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Project Structure](#project-structure)
4. [Tech Stack](#tech-stack)
5. [Services & Microservices](#services--microservices)
6. [Database Schema](#database-schema)
7. [Development Setup](#development-setup)
8. [Infrastructure](#infrastructure)
9. [Key Features](#key-features)
10. [Development Workflow](#development-workflow)

---

## Project Overview

**OpenPlaylist Mono** is a comprehensive microservices-based platform for managing playlists with integrations for streaming platforms (Twitch, DA - likely Discord or another service). The project is built as a monorepo containing multiple services including:

- FastAPI-based backend API
- Python-based bots for Twitch and DA integrations
- Modern React/TypeScript frontend (new_ui)
- Infrastructure orchestration with Docker Compose

The system supports real-time communication via WebSockets (Socket.IO), asynchronous task processing, and multi-service event-driven architecture.

For a **product-focused and implementation-level description** of the app (API, realtime updates, settings, and UI flows), see `docs/PROJECT_DESCRIPTION.md`.

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Traefik Reverse Proxy                   │
│                    (Port: 80/443 - HTTPS Redirect)              │
└────────┬────────────────────────────────────────────────────────┘
         │
    ┌────┴────────┬──────────────┬────────────┐
    │             │              │            │
┌───▼──────┐  ┌──▼──────┐   ┌───▼──────┐  ┌───▼─────────┐
│ Backend  │  │ New UI  │   │ Bot TTV  │  │  Bot DA     │
│ (Port:   │  │ (Port:  │   │ (Twitch) │  │             │
│  8000)   │  │ 3000)   │   │          │  │             │
└───┬──────┘  └─────────┘   └──────────┘  └─────────────┘
    │
    │ (API + WebSocket + Event Queue)
    │
    |
    │                                                     
    ▼                                                     
┌─────────────┐  ┌─────────────┐  ┌─────────────┐  
│ PostgreSQL  │  │  RabbitMQ   │  │   Redis     │  
│ (Port:5438) │  │ (Port:5672) │  │ (Port:6379) │  
└─────────────┘  └─────────────┘  └─────────────┘  
```

### Communication Patterns

- **HTTP/REST**: Frontend to Backend API
- **WebSocket (Socket.IO)**: Real-time playlist updates and notifications
- **RabbitMQ**: Event bus for asynchronous communication between services
- **Redis**: Caching, session storage, and task queue
- **Direct Database**: PostgreSQL as primary data store

---

## Project Structure

```
openplaylist-mono/
├── back-end/                      # Main FastAPI backend service
│   ├── src/
│   │   ├── main.py               # FastAPI application entry point
│   │   ├── settings.py           # Configuration management
│   │   ├── database.py           # Database connection setup
│   │   ├── models/               # Pydantic ORM models
│   │   │   ├── auth_user.py
│   │   │   ├── playlist.py
│   │   │   ├── order.py
│   │   │   ├── settings.py
│   │   │   └── linked_accounts.py
│   │   ├── orm/                  # SQLAlchemy ORM models
│   │   │   ├── auth_user.py
│   │   │   ├── playlist.py
│   │   │   ├── order.py
│   │   │   └── linked_accounts.py
│   │   ├── dto/                  # Data Transfer Objects
│   │   │   ├── user.py
│   │   │   ├── playlist.py
│   │   │   ├── order.py
│   │   │   ├── events.py
│   │   │   ├── token.py
│   │   │   └── twitch.py
│   │   ├── services/             # Business logic layer
│   │   │   ├── auth_service.py
│   │   │   ├── playlist_service.py
│   │   │   ├── order_service.py
│   │   │   ├── twitch_service.py
│   │   │   ├── da_service.py
│   │   │   └── sio_service.py
│   │   ├── services_low/         # Lower-level services
│   │   │   ├── playlist.py
│   │   │   └── settings.py
│   │   ├── dal/                  # Data Access Layer
│   │   │   ├── abstract.py
│   │   │   └── postgres_impl.py
│   │   ├── adapters/             # External service integrations
│   │   │   ├── _fastapi/         # FastAPI route handlers
│   │   │   │   ├── login_routes.py
│   │   │   │   ├── user_routes.py
│   │   │   │   ├── order_routes.py
│   │   │   │   ├── playlist_routes.py
│   │   │   │   └── settings_routes.py
│   │   │   ├── _rabbit/          # RabbitMQ event handlers
│   │   │   │   ├── event_broker.py
│   │   │   │   └── handlers/
│   │   │   │       ├── twitch.py
│   │   │   │       └── da.py
│   │   │   ├── _redis/           # Redis connection & tasks
│   │   │   │   └── broker.py
│   │   │   └── _sio/             # Socket.IO real-time handlers
│   │   │       ├── init.py
│   │   │       └── routes.py
│   │   ├── tasks/                # Async background tasks
│   │   │   ├── order.py
│   │   │   └── playlist.py
│   │   ├── exceptions.py         # Custom exceptions
│   │   ├── utils.py              # Utility functions
│   │   ├── _types.py             # Type definitions
│   │   ├── checkdb.py
│   │   ├── recreate_db.py
│   │   └── repo.py
│   ├── alembic/                  # Database migrations
│   │   └── versions/
│   ├── Dockerfile                # Docker image for backend
│   ├── Dockerfile.tasks          # Docker image for background tasks
│   ├── pyproject.toml            # Python dependencies
│   └── README.md
│
├── bot_ttv/                       # Twitch Bot Service
│   ├── src/
│   │   ├── main.py              # Twitch bot entry point
│   │   ├── config.py
│   │   ├── log_setup.py
│   │   ├── bot_setup.py
│   │   ├── utils.py
│   │   ├── adapters/
│   │   ├── components/
│   │   ├── acl/
│   │   └── dto/
│   ├── Dockerfile
│   ├── pyproject.toml
│   └── README.md
│
├── bot_da/                        # DA Bot Service (Discord/Other)
│   ├── src/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── token_storage.py
│   │   ├── context.py
│   │   ├── utils.py
│   │   ├── models/
│   │   ├── orm/
│   │   ├── dto/
│   │   ├── services/
│   │   ├── adapters/
│   │   └── acl/
│   ├── Dockerfile
│   ├── pyproject.toml
│   └── README.md
│
├── new_ui/                        # React/TypeScript Frontend (Vite)
│   ├── src/
│   │   ├── main.tsx
│   │   ├── styles.css
│   │   ├── api/                  # API client integration
│   │   ├── components/           # React components
│   │   ├── hooks/                # React hooks
│   │   ├── routes/               # Route definitions
│   │   ├── stores/               # State management
│   │   ├── types/                # TypeScript types
│   │   ├── integrations/         # External service integrations
│   │   └── lib/                  # Utility libraries
│   ├── public/                   # Static assets
│   ├── Dockerfile
│   ├── entrypoint.sh
│   ├── nginx.conf                # Nginx configuration
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── eslint.config.js
│   └── prettier.config.js
│
├── docs/
│   └── PROJECT_DESCRIPTION.md      # Detailed description (back-end + new_ui)
│
├── traefik_conf/                  # Traefik reverse proxy configuration
│   └── dynamic_conf.yml
│
├── certs/                         # SSL certificates
├── letsencrypt/                   # Let's Encrypt ACME data
│    └── acme.json
│ 
├── docker-compose.yaml            # Docker Compose orchestration
├── init.sql                        # Database initialization
├── 1.excalidraw                   # Architecture diagrams
└── PROJECT_GUIDE.md               # This file
```

---

## Tech Stack

### Backend

- **Framework**: FastAPI 0.115+
- **Python Version**: 3.13+
- **ORM**: SQLAlchemy 2.0+ with async support
- **Database**: PostgreSQL 14
- **Async Runtime**: asyncio
- **Web Server**: Uvicorn 0.34+
- **WebSocket**: Python-SocketIO 5.16+
- **Message Queue**: RabbitMQ with FastStream
- **Cache/Task Queue**: Redis 7.1+
- **Async Tasks**: Taskiq 0.12+ with Redis backend
- **Authentication**: PyJWT 2.10+
- **Validation**: Pydantic 2.11+
- **API Documentation**: Automatic with FastAPI/Swagger UI

### Databases & Message Systems

- **PostgreSQL 14**: Primary relational database
- **RabbitMQ 4.1.2**: Message broker for event-driven architecture
- **Redis (Alpine)**: In-memory data store, caching, session management

### Frontend (React/TypeScript)

- **Framework**: React with TypeScript
- **Build Tool**: Vite
- **Styling**: CSS with customization
- **UI Components**: Radix UI (dialogs, dropdowns, forms, tooltips, etc.)
- **Drag & Drop**: @dnd-kit
- **Routing**: TanStack Router (from routeTree.gen.ts)
- **Linting**: ESLint
- **Formatting**: Prettier
- **Server**: Nginx with custom configuration

### Infrastructure

- **Reverse Proxy**: Traefik v3.6.7
- **SSL/TLS**: Let's Encrypt with ACME
- **Containerization**: Docker & Docker Compose
- **Port Mapping**:
  - Backend: 8000
  - React UI: 3000
  - PostgreSQL: 5438 (mapped from 5432)
  - RabbitMQ: 5672 (AMQP), 15672 (Management UI)
  - Redis: 6379
  - Traefik: 80 (HTTP), 443 (HTTPS)
  - Traefik Dashboard: 8080 (insecure mode)

---

## Services & Microservices

### 1. Backend Service (main API)

**Location**: `back-end/`

**Responsibilities**:

- REST API for playlist, order, user, and settings management
- Authentication and authorization (JWT-based)
- Real-time WebSocket communication via Socket.IO
- Integration with Twitch and DA platforms
- Event publishing to RabbitMQ
- Background task processing

**Key Routes**:

- `/api/login/` - Authentication
- `/api/users/` - User management
- `/api/orders/` - Order management
- `/api/playlists/` - Playlist CRUD operations
- `/api/settings/` - Settings management
- `/api/socket.io` - WebSocket endpoint

**Dependencies**: FastAPI, SQLAlchemy, Pydantic, FastStream, Redis, RabbitMQ, PostgreSQL

---

### 2. Twitch Bot Service (bot_ttv)

**Location**: `bot_ttv/`

**Responsibilities**:

- Integration with Twitch API
- Bot functionality for Twitch chat
- Handling Twitch-specific events and commands
- Token refresh and authentication with Twitch
- Publishing order events to backend

**Key Data Structures**:

- OAuth tokens for Twitch users
- Twitch user profiles
- Chat command handlers

---

### 3. DA Bot Service (bot_da)

**Location**: `bot_da/`

**Responsibilities**:

- Integration with DA platform (potentially Discord or another service)
- Event handling for DA platform
- Token management and OAuth flows
- User context and ACL (Access Control List)

**Redis Schema** (from README):

```
{user_id}:{playlist_name}:settings
```

---

### 4. React Frontend (new_ui)

**Location**: `new_ui/`

**Responsibilities**:

- Modern, user-facing interface
- Real-time updates via Socket.IO
- Playlist management UI
- User authentication and profiles
- Drag-and-drop playlist reordering

**Features**:

- Component-based architecture with Radix UI
- Real-time notifications
- Responsive design
- TypeScript type safety

---

## Database Schema

### ORM-aligned schema (updated)

This section reflects the current SQLAlchemy models in:

- `back-end/src/orm/auth_user.py`
- `back-end/src/orm/linked_accounts.py`
- `back-end/src/orm/token_vault.py`
- `back-end/src/orm/playlist.py`
- `back-end/src/orm/settings.py`

#### Relationship map

```
users (1) ────────────────< linked_accounts (N)
  │                             │
  │                             └──────────────< token_vault (N)
  │
  └──────────────(owner_id refs in business domain)

playlists (1) ─────────────< order_playlist_status >──────────── (1) orders
   │                                 (N:M junction)
   │
   └───────────────< settings
                          │
                          ├──< content_settings
                          ├──< chat_rules
                          ├──< donation_rules
                          └──< block_list
```

#### Table summary

- `users`: auth/profile table (`email` unique+indexed, `social_links` JSONB, `last_login` default `now()`).
- `linked_accounts`: external identities (`platform`, `platform_user_id`, `platform_user_email`, `bot_connection`).
- `token_vault`: OAuth credentials (`access_token`, `refresh_token`, `token_type`, `expires_at`, FK to `linked_accounts` with cascade).
- `playlists`: owner metadata plus queue controls (`allow_sources` is JSONB default `[]`, `tags` is ARRAY text, `now_playing` nullable).
- `orders`: request records (`request_id` unique, `owner_platform_id`, `source` enum, `extra_data` JSONB).
- `order_playlist_status`: N:M link (`order_id` + `playlist_id` composite PK, `status` enum default `'in playlist'`).
- `settings`: playlist behavior root (`playlist_id` FK indexed + cascade, `sort_settings` JSONB default `{"date":"desc","priority":"none","shuffle":"none"}`).
- `content_settings`: per-platform constraints (`min_views`, `min_likes`, cooldown fields).
- `chat_rules`: chat rule entries (`platform`, `key`, `priority`, unique index on `(settings_id, platform, key)`, `overrive_order` spelling in model).
- `donation_rules`: donation rules (unique index on `(settings_id, platform, currency, amount)`).
- `block_list`: blocked identity rules (`trigger_type` = `USER_ID|USER_NAME`, `trigger_value`, `platform`).

#### Important corrections vs previous guide text

- Tokens are stored in `token_vault`, **not** in `linked_accounts`.
- `users` does **not** define `main_platform`.
- `playlists.allow_sources` is `JSONB`, not `ARRAY(ENUM)`.
- `settings` currently allows multiple rows per playlist at ORM level (no unique constraint on `playlist_id` in model).
- `chat_rules` field name is `overrive_order` in the ORM.

### Legacy detailed schema notes (older)

### Entity Relationship Overview (legacy)

```
┌──────────────────┐
│     Users        │ (1)
│  (auth_user)     │──────┐
└──────────────────┘      │ (1:N)
                          │
┌──────────────────┐      │    ┌─────────────────────────┐
│  LinkedAccounts  │◄─────┴────┤ OrderPlaylistStatus     │◄──┐
│                  │           │ (Junction Table)        │   │
└──────────────────┘           └─────────────────────────┘   │
                                         ▲                   │
                                         │ (FK)              │ (1:N)
                                         │                   │
                               ┌─────────┴──────────┐        │
                               │   Playlists        │◄───────┘
                               │                    │
                               │ ┌──────────────────┤
                               │ │ (1:1)            │
                               │ ▼                  │
                               │ Settings           │
                               │                    │
                               └────────────────────┘
                                       ▲
                    ┌─────────────────┬┴─────────────┐
                    │                 │              │
            ┌───────▼────────┐ ┌──────▼────────┐ ┌───▼──────────┐
            │ ContentSettings│ │ ChatRules     │ │DonationRules │
            │                │ │               │ │              │
            └────────────────┘ └───────────────┘ └──────────────┘
                    │                                      │
                    │                                      │
            ┌───────▼────────┐                    ┌────────▼─────────┐
            │ BlockList      │                    │ Orders           │
            │                │                    │ (tracks/videos)  │
            └────────────────┘                    └──────────────────┘
```

### Detailed Entity Definitions

#### 1. **Users** (`users` table)

Core user authentication and profile management.

**Fields:**


| Column           | Type      | Constraints | Description                                            |
| ---------------- | --------- | ----------- | ------------------------------------------------------ |
| `id`             | UUID      | PK          | Unique user identifier                                 |
| `created_at`     | TIMESTAMP | NOT NULL    | Record creation timestamp                              |
| `updated_at`     | TIMESTAMP | NOT NULL    | Last update timestamp                                  |
| `last_login`     | TIMESTAMP | NOT NULL    | Last login datetime                                    |
| `username`       | VARCHAR   | NOT NULL    | User's display name                                    |
| `main_platform`  | ENUM      | NOT NULL    | Primary linked platform (Twitch/YouTube/DA/Google/Web) |
| `vip_expires_at` | TIMESTAMP | NULLABLE    | VIP subscription expiration                            |


**Relationships:**

- **1:N** → LinkedAccounts (eager loaded, `lazy="joined"`)
- **Indirectly 1:N** → Playlists (via owner_id)
- **Indirectly 1:N** → Orders (via owner_id)

**Indexes:**

- Primary: `id`
- Implicit: `username` (for quick user lookup)

---

#### 2. **LinkedAccounts** (`linked_accounts` table)

OAuth and platform integrations for each user.

**Fields:**


| Column                | Type      | Constraints             | Description                                  |
| --------------------- | --------- | ----------------------- | -------------------------------------------- |
| `id`                  | UUID      | PK                      | LinkedAccount ID                             |
| `created_at`          | TIMESTAMP | NOT NULL                | Record creation timestamp                    |
| `updated_at`          | TIMESTAMP | NOT NULL                | Last update timestamp                        |
| `user_id`             | UUID      | FK(users.id), NOT NULL  | Reference to parent user                     |
| `platform`            | ENUM      | NOT NULL                | Platform type (Twitch/YouTube/DA/Google/Web) |
| `platform_user_id`    | VARCHAR   | NOT NULL                | External platform's user ID                  |
| `platform_username`   | VARCHAR   | NOT NULL                | External platform's username                 |
| `platform_avatar_url` | VARCHAR   | NOT NULL                | External platform avatar URL                 |
| `bot_connection`      | BOOLEAN   | NOT NULL, DEFAULT=False | Whether bot is connected to this account     |
| `access_token`        | VARCHAR   | NOT NULL                | OAuth access token (encrypted at rest)       |
| `refresh_token`       | VARCHAR   | NOT NULL                | OAuth refresh token (encrypted at rest)      |
| `expires_at`          | INTEGER   | NOT NULL                | Token expiration (Unix timestamp)            |


**Relationships:**

- **N:1** ← Users (FK: user_id)

**Indexes:**

- Primary: `id`
- Foreign: `user_id` (for user → linked accounts queries)
- Composite: `(user_id, platform)` (likely unique constraint to prevent duplicates)

**Business Logic:**

- Tracks OAuth tokens with refresh capability
- Bot connection flag controls bot access to this platform
- Supports multiple platform links per user

---

#### 3. **Playlists** (`playlists` table)

User-created playlist collections with track management.

**Fields:**


| Column                       | Type           | Constraints             | Description                              |
| ---------------------------- | -------------- | ----------------------- | ---------------------------------------- |
| `id`                         | UUID           | PK                      | Unique playlist identifier               |
| `created_at`                 | TIMESTAMP      | NOT NULL                | Playlist creation datetime               |
| `updated_at`                 | TIMESTAMP      | NOT NULL                | Last modification datetime               |
| `owner_id`                   | UUID           | NOT NULL                | User who created/owns playlist           |
| `owner_nickname`             | VARCHAR        | NOT NULL                | Owner's username snapshot                |
| `name`                       | VARCHAR(100)   | NOT NULL                | Playlist name                            |
| `description`                | VARCHAR(255)   | NULLABLE                | Playlist description                     |
| `is_public`                  | BOOLEAN        | NOT NULL, DEFAULT=False | Public/private visibility                |
| `is_favorite`                | BOOLEAN        | NOT NULL, DEFAULT=False | User's favorite flag                     |
| `tags`                       | ARRAY(VARCHAR) | NULLABLE                | Genre/category tags                      |
| `allow_sources`              | ARRAY(ENUM)    | NULLABLE                | Allowed source platforms for requests    |
| `is_allow_external_requests` | BOOLEAN        | NOT NULL, DEFAULT=False | Allow track requests from external users |
| `now_playing`                | VARCHAR        | NULLABLE                | Currently playing track identifier       |


**Relationships:**

- **1:1** → Settings (cascade delete, FK in Settings table)
- **1:N** → OrderPlaylistStatus (lazy selectin)
- **N:M** → Orders (via OrderPlaylistStatus junction table)

**Indexes:**

- Primary: `id`
- Foreign: `owner_id` (user → their playlists)

**Special Proxies:**

- `order_links`: Direct access to all linked orders
- `track_data`: Only active orders (status='in playlist')
- `active_order_associations`: Eagerly loaded active tracks

---

#### 4. **Orders** (`orders` table)

Individual track/video requests within playlists.

**Fields:**


| Column               | Type      | Constraints     | Description                                    |
| -------------------- | --------- | --------------- | ---------------------------------------------- |
| `id`                 | UUID      | PK              | Unique order/track identifier                  |
| `created_at`         | TIMESTAMP | NOT NULL        | Request timestamp                              |
| `updated_at`         | TIMESTAMP | NOT NULL        | Last update timestamp                          |
| `yt_video_id`        | VARCHAR   | NOT NULL        | YouTube video ID or equivalent                 |
| `title`              | VARCHAR   | NOT NULL        | Track/video title                              |
| `duration`           | INTEGER   | NOT NULL        | Duration in seconds                            |
| `views`              | INTEGER   | NOT NULL        | View count from source platform                |
| `likes`              | INTEGER   | NOT NULL        | Like count from source platform                |
| `priority`           | VARCHAR   | NOT NULL        | Priority level for playback ordering           |
| `requester_nickname` | VARCHAR   | NOT NULL        | Who requested this track                       |
| `request_id`         | UUID      | UNIQUE NOT NULL | Unique request identifier                      |
| `owner_id`           | UUID      | NOT NULL        | Track owner/uploader                           |
| `from_owner`         | BOOLEAN   | NOT NULL        | Is requester same as owner?                    |
| `source`             | ENUM      | NOT NULL        | Source platform (Twitch/YouTube/DA/Google/Web) |
| `extra_data`         | JSONB     | NULLABLE        | Flexible metadata storage                      |


**Relationships:**

- **N:M** ← Playlists (via OrderPlaylistStatus)

**Indexes:**

- Primary: `id`
- Unique: `request_id` (prevent duplicate requests)
- Foreign: Implicit on playlist associations

**Data Integrity:**

- YouTube metadata snapshot captured at request time
- Extra metadata in JSONB for extensibility

---

#### 5. **OrderPlaylistStatus** (`order_playlist_status` table)

Junction table managing many-to-many relationship between orders and playlists.

**Fields:**


| Column        | Type      | Constraints                     | Description                    |
| ------------- | --------- | ------------------------------- | ------------------------------ |
| `order_id`    | UUID      | PK, FK(orders.id)               | Reference to order             |
| `playlist_id` | UUID      | PK, FK(playlists.id)            | Reference to playlist          |
| `status`      | ENUM      | NOT NULL, DEFAULT='in playlist' | Track status in playlist       |
| `created_at`  | TIMESTAMP | NOT NULL                        | Association creation timestamp |
| `updated_at`  | TIMESTAMP | NOT NULL                        | Last status update timestamp   |


**Status Values:**

- `'in playlist'` - Active in playlist (default)
- `'removed'` - Manually removed by user
- `'listened'` - Finished playing
- `'skipped'` - Skipped by user
- `'reported'` - Flagged/reported

**Relationships:**

- **N:1** ← Orders (FK: order_id)
- **N:1** ← Playlists (FK: playlist_id)

**Indexes:**

- Composite Primary: `(order_id, playlist_id)`
- Implicit: Foreign keys for both directions

---

#### 6. **Settings** (`settings` table)

Playlist-specific configuration and content rules.

**Fields:**


| Column              | Type           | Constraints                               | Description                               |
| ------------------- | -------------- | ----------------------------------------- | ----------------------------------------- |
| `id`                | UUID           | PK                                        | Settings identifier                       |
| `created_at`        | TIMESTAMP      | NOT NULL                                  | Settings creation time                    |
| `updated_at`        | TIMESTAMP      | NOT NULL                                  | Last update timestamp                     |
| `playlist_id`       | UUID           | FK(playlists.id), CASCADE DELETE, INDEXED | Playlist reference                        |
| `max_playlist_size` | INTEGER        | NOT NULL, DEFAULT=0                       | Maximum tracks allowed (0=unlimited)      |
| `mode`              | ENUM           | NOT NULL, DEFAULT='flow'                  | Playlist mode: 'flow' or 'static'         |
| `repeat_mode`       | ENUM           | NOT NULL, DEFAULT='none'                  | Repeat: 'all', 'once', or 'none'          |
| `sort_settings`     | JSONB          | NOT NULL                                  | Sorting config: {date, priority, shuffle} |
| `cost_mode`         | ENUM           | NOT NULL, DEFAULT='max'                   | Donation mode: 'add' or 'max'             |
| `track_black_list`  | ARRAY(VARCHAR) | NULLABLE                                  | Blacklisted track IDs                     |


**Relationships:**

- **1:1** ← Playlists (bidirectional, lazy selectin)
- **1:N** → ContentSettings (cascade delete)
- **1:N** → ChatRules (cascade delete)
- **1:N** → DonationRules (cascade delete)
- **1:N** → BlockList (cascade delete)

**Indexes:**

- Primary: `id`
- Foreign: `playlist_id` (indexed, for settings lookup by playlist)

**JSON Structure (sort_settings):**

```json
{
  "date": "asc|desc",
  "priority": "asc|desc|none",
  "shuffle": "enabled|disabled|none"
}
```

---

#### 7. **ContentSettings** (`content_settings` table)

Per-platform content validation rules.

**Fields:**


| Column           | Type      | Constraints                     | Description                                    |
| ---------------- | --------- | ------------------------------- | ---------------------------------------------- |
| `id`             | UUID      | PK                              | ContentSettings identifier                     |
| `created_at`     | TIMESTAMP | NOT NULL                        | Record creation timestamp                      |
| `updated_at`     | TIMESTAMP | NOT NULL                        | Last update timestamp                          |
| `settings_id`    | UUID      | FK(settings.id), CASCADE DELETE | Parent settings reference                      |
| `platform`       | ENUM      | NOT NULL                        | Platform: Twitch/YouTube/DA/Google/Web/General |
| `min_views`      | INTEGER   | DEFAULT=10000                   | Minimum view threshold                         |
| `min_likes`      | INTEGER   | NOT NULL, DEFAULT=500           | Minimum like threshold                         |
| `max_duration`   | INTEGER   | NOT NULL, DEFAULT=600           | Maximum track duration (seconds)               |
| `track_cooldown` | INTEGER   | NOT NULL, DEFAULT=0             | Cooldown between same tracks (seconds)         |
| `user_cooldown`  | INTEGER   | NOT NULL, DEFAULT=2             | Cooldown between user requests (seconds)       |


**Relationships:**

- **N:1** ← Settings (lazy selectin)

**Business Logic:**

- Enforces content quality standards per platform
- Prevents spam through cooldown mechanisms
- Flexible validation by source platform

---

#### 8. **ChatRules** (`chat_rules` table)

Chat platform-specific behavior rules.

**Fields:**


| Column             | Type         | Constraints                     | Description                               |
| ------------------ | ------------ | ------------------------------- | ----------------------------------------- |
| `id`               | UUID         | PK                              | ChatRules identifier                      |
| `created_at`       | TIMESTAMP    | NOT NULL                        | Record creation timestamp                 |
| `updated_at`       | TIMESTAMP    | NOT NULL                        | Last update timestamp                     |
| `settings_id`      | UUID         | FK(settings.id), CASCADE DELETE | Parent settings reference                 |
| `platform`         | ENUM         | NOT NULL                        | Chat platform: Twitch or YouTube          |
| `key`              | VARCHAR(255) | NOT NULL                        | Rule identifier/name                      |
| `priority`         | INTEGER      | NOT NULL                        | Execution order (lower = higher priority) |
| `content_settings` | JSONB        | NULLABLE                        | Flexible rule configuration               |
| `override_order`   | INTEGER      | NULLABLE                        | Override playlist order (position)        |


**Relationships:**

- **N:1** ← Settings (lazy selectin)

**Supported Chat Platforms:**

- `TWITCH` - Twitch chat integration
- `YOUTUBE` - YouTube live chat integration

---

#### 9. **DonationRules** (`donation_rules` table)

Donation platform reward configuration.

**Fields:**


| Column             | Type         | Constraints                     | Description                       |
| ------------------ | ------------ | ------------------------------- | --------------------------------- |
| `id`               | UUID         | PK                              | DonationRules identifier          |
| `created_at`       | TIMESTAMP    | NOT NULL                        | Record creation timestamp         |
| `updated_at`       | TIMESTAMP    | NOT NULL                        | Last update timestamp             |
| `settings_id`      | UUID         | FK(settings.id), CASCADE DELETE | Parent settings reference         |
| `platform`         | ENUM         | NOT NULL                        | Donation platform (General or DA) |
| `name`             | VARCHAR(255) | NOT NULL                        | Rule name (e.g., "VIP Request")   |
| `slug`             | VARCHAR(255) | NOT NULL                        | URL-safe rule identifier          |
| `currency`         | VARCHAR(3)   | NOT NULL, DEFAULT='USD'         | Currency code (ISO 4217)          |
| `amount`           | FLOAT        | NOT NULL, DEFAULT=5.0           | Donation amount threshold         |
| `priority`         | INTEGER      | NOT NULL                        | Rule priority (lower = higher)    |
| `content_settings` | JSONB        | NULLABLE                        | Rule-specific behavior config     |


**Relationships:**

- **N:1** ← Settings (lazy selectin)

**Indexes:**

- Composite Unique: `(settings_id, platform, currency, amount)`

**Supported Donation Platforms:**

- `__general__` - Generic donation rules
- `donationalerts` - DonationAlerts platform

---

#### 10. **BlockList** (`block_list` table)

User/content blocking and filtering rules.

**Fields:**


| Column          | Type         | Constraints                     | Description                          |
| --------------- | ------------ | ------------------------------- | ------------------------------------ |
| `id`            | UUID         | PK                              | BlockList entry identifier           |
| `created_at`    | TIMESTAMP    | NOT NULL                        | Record creation timestamp            |
| `updated_at`    | TIMESTAMP    | NOT NULL                        | Last update timestamp                |
| `settings_id`   | UUID         | FK(settings.id), CASCADE DELETE | Parent settings reference            |
| `trigger_type`  | ENUM         | NOT NULL                        | Block trigger: user_id or user_name  |
| `trigger_value` | VARCHAR(255) | NOT NULL                        | Value to block (user ID or username) |
| `platform`      | ENUM         | NOT NULL                        | Platform for this block rule         |


**Relationships:**

- **N:1** ← Settings (lazy selectin)

**Trigger Types:**

- `USER_ID` - Block by platform user ID
- `USER_NAME` - Block by username

---

### Enum Type Definitions

**Platform:**

- `twitch` - Twitch platform
- `youtube` - YouTube platform
- `da` - DonationAlerts platform
- `google` - Google authentication
- `web` - Web platform

**ChatPlatform:**

- `twitch` - Twitch chat
- `youtube` - YouTube live chat

**DonationPlatform:**

- `__general_`_ - Generic platform
- `donationalerts` - DonationAlerts

**OrderPlaylistStatus:**

- `in playlist` - Active
- `removed` - Deleted
- `listened` - Completed
- `skipped` - User skipped
- `reported` - Flagged

**Settings.mode:**

- `flow` - Continuous playback
- `static` - Fixed playlist

**Settings.repeat_mode:**

- `all` - Loop entire playlist
- `once` - One-time playback
- `none` - No repeat

**Settings.cost_mode:**

- `add` - Additive donation support
- `max` - Maximum donation wins

---

### Cascading Constraints & Data Integrity

**CASCADE DELETE Operations:**

- Settings → ContentSettings, ChatRules, DonationRules, BlockList (deleting playlist settings cascades to all children)
- Orders marked with status transitions but retain history
- No cascade on Users (orphaned playlists/accounts handled by business logic)

**Referential Integrity:**

- All foreign keys enforced at database level
- Playlist must exist for Settings
- Settings must exist for content/chat/donation/block rules

**Unique Constraints:**

- Users: `(id)` - Primary
- LinkedAccounts: Likely composite on `(user_id, platform)`
- Orders: `request_id` - Prevents duplicate submissions
- DonationRules: `(settings_id, platform, currency, amount)` - Prevents duplicate donation tiers

---

### Database Optimization Strategies

**Lazy Loading:**

- ContentSettings, ChatRules, DonationRules, BlockList: Eager-loaded with `lazy="selectin"` for reduced query count
- linkedAccounts: Joined with Users for one query

**Indexing:**

- Foreign keys auto-indexed by PostgreSQL
- `playlist_id` in Settings explicitly indexed for fast lookups
- Composite indexes on junction table

**Query Patterns:**

- Get user with all linked accounts: 1 query (joined)
- Get playlist with all active tracks: 1 query (selectin)
- Get all settings for playlist: 1 query with cascade

---

### Database Initialization & Migrations

**Initial Setup:**

- `init.sql` - Creates initial schema and seed data
- `alembic/versions/` - Migration files with version history
- `env.py` - Alembic configuration for environment-specific settings

**Migration Workflow:**

```bash
# Generate migration from model changes
alembic revision --autogenerate -m "description"

# Apply migrations
alembic upgrade head

# Downgrade to previous version
alembic downgrade -1

# View migration history
alembic current
```

**Benefits:**

- Version control for schema changes
- Rollback capability
- Team collaboration on database structure
- Environment parity (dev/staging/prod)

---

## Development Setup

### Prerequisites

- Docker and Docker Compose
- Python 3.13+ (for local development)
- Node.js 18+ (for frontend development)
- Git

### Quick Start with Docker Compose

```bash
# Navigate to project root
cd openplaylist-mono

# Start all services
docker-compose up -d

# Services will be available at:
# - Backend API: http://localhost:8000
# - React UI: http://localhost:3000
# - PostgreSQL: localhost:5438
# - RabbitMQ Management: http://localhost:15672
# - Redis: localhost:6379
```

### Local Backend Development

```bash
# Navigate to backend
cd back-end

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# On Windows:
.venv\Scripts\activate
# On Unix/Linux/Mac:
source .venv/bin/activate

# Install dependencies
pip install -e .

# Set up environment variables
cp .env.example .env

# Run migrations
alembic upgrade head

# Start development server
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

### Local React Frontend Development

```bash
# Navigate to new_ui
cd new_ui

# Install dependencies
npm install

# Start development server
npm run dev

# App runs on http://localhost:3000
```

### Environment Variables

Backend (`back-end/.env`):

```
DATABASE_URL=postgresql+asyncpg://openplaylist_mono_user:password@localhost:5438/openplaylist_mono
REDIS_URL=redis://localhost:6379
RABBITMQ_URL=amqp://guest:guest@localhost:5672/
SECRET_KEY=your-secret-key-here
TWITCH_CLIENT_ID=your-twitch-client-id
TWITCH_CLIENT_SECRET=your-twitch-secret
```

### Database Migrations

```bash
# Create a new migration
cd back-end
alembic revision --autogenerate -m "description of changes"

# Apply migrations
alembic upgrade head

# Rollback to previous version
alembic downgrade -1
```

---

## Infrastructure

### Docker Compose Services

#### PostgreSQL Database

- **Image**: postgres:14
- **Port**: 5438 (external) → 5432 (internal)
- **Volume**: postgres_data
- **Health Check**: Every 5s, timeout 5s, 5 retries
- **Initialization**: `init.sql` script

#### RabbitMQ

- **Image**: rabbitmq:4.1.2-management
- **Port**: 5672 (AMQP), 15672 (Management UI)
- **Volume**: rabbitmq_data
- **Health Check**: rabbitmq-diagnostics ping every 30s

#### Redis

- **Image**: redis:alpine
- **Port**: 6379
- **Command**: redis-server with AOF persistence
- **Volume**: redis_data
- **Health Check**: redis-cli ping every 1s

#### Traefik Reverse Proxy

- **Image**: traefik:v3.6.7
- **Port**: 80, 443
- **Features**:
  - Automatic HTTP to HTTPS redirect
  - Let's Encrypt ACME certificate provisioning
  - Docker integration for service discovery
  - Insecure API dashboard at port 8080

#### Backend Service

- **Build**: ./back-end/Dockerfile
- **Port**: 8000
- **Dependencies**: database (healthy), redis (healthy), rabbitmq (healthy)
- **Env File**: Loaded from .env

#### Frontend Services

- **React UI**: Port 3000

### Networking

- All services connected via bridge network
- Service discovery via Docker DNS
- Internal service-to-service communication via service names

### Volumes

- `postgres_data`: PostgreSQL persistent storage
- `rabbitmq_data`: RabbitMQ persistent storage
- `redis_data`: Redis persistent storage
- `letsencrypt/`: SSL certificate storage

---

## Key Features

### 1. Playlist Management

- Create, read, update, delete playlists
- Add/remove playlist items (orders)
- Reorder playlist items (drag-and-drop)
- Playlist sharing and visibility control

### 2. Multi-Platform Integration

- **Twitch Integration**: OAuth, token refresh, account linking
- **DA Integration**: Account management, event handling
- Pull video/track metadata from multiple sources

### 3. Real-Time Updates

- Socket.IO connections for live playlist updates
- Namespace-based event routing:
  - `/plst_upds` - Playlist updates
  - `/` - General events
- Real-time notifications

### 4. Authentication & Security

- JWT token-based authentication
- OAuth flows for third-party platforms
- Account linking and unlinking
- Token refresh mechanisms

### 5. Asynchronous Processing

- Background task queue via Taskiq + Redis
- Event-driven architecture with RabbitMQ
- Handlers for Twitch and DA events
- Task persistence and retry mechanisms

### 6. Data Persistence

- PostgreSQL for structured data
- Redis for caching and session management
- Alembic for schema versioning
- Data export/import capabilities

---

## Development Workflow

### Code Organization Principles

#### Backend (FastAPI)

1. **Models** (`models/`) - Pydantic models for validation
2. **ORM** (`orm/`) - SQLAlchemy table definitions
3. **DTO** (`dto/`) - Data transfer objects for API
4. **DAL** (`dal/`) - Data access layer abstraction
5. **Services** (`services/`) - Business logic
6. **Adapters** (`adapters/`) - External integrations
7. **Routes** (`_fastapi/`) - API endpoint handlers
8. **Tasks** (`tasks/`) - Background job definitions
9. **Exceptions** (`exceptions.py`) - Custom error definitions

#### Frontend

- **Components** (`components/`) - Reusable React components
- **Hooks** (`hooks/`) - React custom hooks
- **Routes** (`routes/`) - Page routing
- **API** (`api/`) - Backend API client
- **Stores** (`stores/`) - State management
- **Types** (`types/`) - TypeScript type definitions

### Common Development Tasks

#### Adding a New API Endpoint

1. Create DTO in `dto/http/request/`
2. Create response model in `models/`
3. Define router in `adapters/_fastapi/`
4. Implement service logic in `services/`
5. Add database query in `dal/`
6. Write tests

#### Adding a New Event Handler

1. Define event type in `dto/events.py`
2. Create handler in `adapters/_rabbit/handlers/`
3. Register handler in `adapters/_rabbit/event_broker.py`
4. Emit event from service when needed

#### Adding Real-Time Socket.IO Event

1. Define event in `dto/events.py`
2. Add handler in `adapters/_sio/routes.py`
3. Emit from service using `PlstUpdsNamespace`

### Deployment

```bash
# Build all images
docker-compose build

# Push to registry
docker-compose push

# Deploy
docker-compose up -d
```

---

## Notes & Conventions

- **Async/Await**: All database and I/O operations use async patterns
- **Error Handling**: Custom exceptions in `exceptions.py`
- **Logging**: Structured logging throughout services
- **Type Safety**: Full type hints in Python and TypeScript
- **API Documentation**: Automatic Swagger UI at `/docs`
- **CORS**: Configured for localhost development and production domains

---

## Troubleshooting

### Services Won't Start

1. Check Docker daemon is running
2. Verify ports are not in use
3. Check environment variables in `.env` files
4. Review `docker-compose logs` for errors

### Database Connection Issues

1. Verify PostgreSQL health: `docker-compose ps`
2. Check connection string in `.env`
3. Ensure migrations are run: `alembic upgrade head`

### RabbitMQ Connection Issues

1. Check RabbitMQ is healthy: `docker-compose logs rabbitmq`
2. Verify AMQP connection string
3. Check exchange and queue declarations

### Redis Connection Issues

1. Verify Redis service is running
2. Check Redis connection string
3. Flush Redis if necessary (development only)

---

**Last Updated**: April 2026
**Project Status**: Active Development
**Repository**: openplaylist-mono