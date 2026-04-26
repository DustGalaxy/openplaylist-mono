# Bot DA - Service Documentation

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Project Structure](#project-structure)
4. [Dependencies](#dependencies)
5. [Configuration](#configuration)
6. [Core Components](#core-components)
7. [Data Models](#data-models)
8. [Workflow & Flow](#workflow--flow)
9. [Message Queue Integration](#message-queue-integration)
10. [Database Schema](#database-schema)
11. [WebSocket Integration](#websocket-integration)
12. [Deployment](#deployment)
13. [Running & Development](#running--development)

---

## Overview

**bot_da** is a specialized microservice designed to integrate with **DonationAlerts (DA)** - a platform that receives and manages donations for content creators. This service acts as a bridge between the DonationAlerts platform and the OpenPlaylist ecosystem.

### Key Responsibilities:
- **Real-time Donation Listening**: Connects to DonationAlerts WebSocket (Centrifugo) to receive donation events in real-time
- **OAuth Integration**: Handles OAuth2 authentication flow with DonationAlerts API
- **Token Management**: Manages access and refresh tokens for authenticated users
- **Order Generation**: Converts donations into playable order requests that are published to the message broker
- **User Management**: Maintains local user records linked to DonationAlerts accounts

### Primary Use Case:
When a user donates via DonationAlerts to a content creator using OpenPlaylist, this service:
1. Receives the donation event
2. Validates the donation against user settings/blacklists
3. Converts it to a playable order with video URL
4. Publishes the order to the message broker for the main service to process

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     DonationAlerts Platform                      │
│                    (OAuth + WebSocket API)                       │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │   bot_da       │
                    │  Microservice  │
                    └────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        ▼                    ▼                    ▼
    ┌────────┐          ┌────────┐          ┌────────┐
    │ RabbitMQ│          │PostgreSQL│       │Redis   │
    │  (Events)│         │(User Data)│      │(Cache) │
    └────────┘          └────────┘          └────────┘
        ▲
        │ (Order Events)
        ▼
┌─────────────────────────────────────────┐
│   Back-end Service / Main Application   │
└─────────────────────────────────────────┘
```

### Communication Pattern

- **Inbound**: Receives linked account info from auth service via RabbitMQ
- **Outbound**: Publishes tokens refresh events and order creation events via RabbitMQ
- **WebSocket**: Maintains persistent WebSocket connections to DonationAlerts' Centrifugo server

---

## Project Structure

```
bot_da/
├── Dockerfile              # Container image definition
├── pyproject.toml          # Python project configuration (uv)
├── README.md              # Basic readme
├── .docker.env            # Docker environment variables
├── .env                   # Local environment variables
├── .python-version        # Python version (3.13)
│
└── src/
    ├── main.py            # FastAPI application entry point
    ├── config.py          # Configuration loader (Pydantic Settings)
    ├── context.py         # Global application context
    ├── database.py        # SQLAlchemy async setup
    ├── token_storage.py   # Token persistence utilities
    ├── utils.py           # Utility functions
    ├── _types.py          # Abstract base classes and interfaces
    │
    ├── acl/               # Access Control Layer
    │   ├── user.py        # User ACL - fetches linked accounts
    │   └── playlist.py    # Playlist ACL
    │
    ├── adapters/          # External service integrations
    │   ├── _rabbit/       # RabbitMQ integration
    │   │   ├── broker.py      # Broker configuration & queue definitions
    │   │   ├── dto.py         # Data Transfer Objects for messages
    │   │   └── handlers.py    # RabbitMQ subscribers/handlers
    │   │
    │   ├── _redis/        # Redis integration
    │   │   └── broker.py      # Redis connection & adapter
    │   │
    │   └── _repository/   # Data access layer
    │       └── user.py        # User repository (CRUD operations)
    │
    ├── dto/               # Domain Transfer Objects
    │   ├── da.py          # DonationAlerts data models
    │   ├── order.py       # Order-related models
    │   └── settings.py    # Settings models
    │
    ├── models/            # Pydantic models for API/business logic
    │   ├── donation.py    # Donation models
    │   └── user.py        # User models
    │
    ├── orm/               # SQLAlchemy ORM models
    │   ├── donation.py    # Donation ORM entity
    │   └── user.py        # User ORM entity
    │
    └── services/          # Business logic layer
        ├── da_client.py       # DonationAlerts API client & WebSocket listener
        ├── handler.py         # Message handler for donations
        ├── manager.py         # Connection manager
        └── __init__.py
```

---

## Dependencies

All dependencies are defined in `pyproject.toml` and managed by `uv`:

```toml
dependencies = [
    "aiosqlite>=0.21.0",              # Async SQLite support
    "fastapi>=0.116.1",               # Web framework
    "faststream[rabbit]>=0.5.48",     # RabbitMQ integration
    "httpx>=0.28.1",                  # Async HTTP client
    "itsdangerous>=2.2.0",            # Token serialization
    "pydantic-settings>=2.10.1",      # Configuration management
    "redis>=6.4.0",                   # Redis client
    "simple-repo-asyncsqla>=2.0.1",   # Repository pattern implementation
    "sqlalchemy[asyncio]>=2.0.43",    # ORM with async support
    "uuid6>=2025.0.1",                # UUID v6/v7 generation
    "uvicorn>=0.35.0",                # ASGI server
    "websockets>=15.0.1",             # WebSocket client/server
]
```

### Key Dependencies Explained:
- **FastAPI**: Web framework for REST endpoints (if needed in future)
- **FastStream**: Message broker abstraction for RabbitMQ
- **SQLAlchemy**: ORM for database operations
- **httpx**: Making authenticated requests to DonationAlerts API
- **websockets**: WebSocket client for Centrifugo connection
- **Redis**: Caching and session storage
- **Pydantic**: Data validation and configuration

---

## Configuration

Configuration is centralized in `config.py` using Pydantic Settings, which loads from environment variables:

```python
class Settings(BaseSettings):
    # OAuth Configuration
    APP_ID: str                        # DonationAlerts App ID
    API_KEY: str                       # DonationAlerts API Key
    REDIRECT_URI: str                  # OAuth redirect URI
    SESSION_SECRET_KEY: str            # Session encryption key
    
    # Infrastructure URLs
    RABBITMQ_URL: str                  # RabbitMQ connection string
    DB_URL: str                        # Database URL (PostgreSQL/SQLite)
    REDIS_URL: str                     # Redis connection string
    
    # DonationAlerts API Configuration
    DA_SCOPES: str = "oauth-user-show oauth-donation-subscribe"
    DA_AUTHORIZATION_URL: str = "https://www.donationalerts.com/oauth/authorize"
    DA_TOKEN_URL: str = "https://www.donationalerts.com/oauth/token"
    DA_API_BASE_URL: str = "https://www.donationalerts.com/api/v1"
    DA_CENTRIFUGO_URL: str = "wss://centrifugo.donationalerts.com/connection/websocket"
```

### Environment Setup:
- Copy `.docker.env` or `.env` to configure the service
- Required variables must be set before startup

---

## Core Components

### 1. **DonationAlertsListener** (`src/services/da_client.py`)

The main client responsible for connecting to and listening to DonationAlerts events.

#### Responsibilities:
- OAuth2 token management and refresh
- WebSocket connection to Centrifugo
- Subscription to donation alerts channel
- Message reception and delegation to handler

#### Key Methods:
- `async start()`: Initiates connection loop
- `async stop()`: Gracefully closes connection
- `async _connection_loop()`: Handles reconnection logic with exponential backoff
- `async _connect_and_listen(socket_token, access_token)`: Establishes WebSocket connection
- `async refresh_access_token()`: Refreshes expired tokens and publishes refresh event

#### Token Refresh Flow:
1. Checks if token is expired or about to expire
2. Makes request to DonationAlerts token endpoint
3. Publishes `DATokenRefreshed` event to RabbitMQ
4. Updates local token state

### 2. **Manager** (`src/services/manager.py`)

Orchestrates multiple DonationAlerts connections for different users.

#### Responsibilities:
- Create and manage listener connections per user
- Start/stop all listeners on application lifecycle events
- Add new connections dynamically
- Maintain registry of active connections

#### Key Methods:
- `async start()`: Loads all users and starts listeners
- `async add_connection(link)`: Adds a new user connection
- `async stop()`: Stops all active connections
- `async run_connection(client)`: Starts a listener and registers it

### 3. **Message Handler** (`src/services/handler.py`)

Processes incoming donation messages from WebSocket.

#### Responsibilities:
- Parse WebSocket messages
- Extract donation data
- Validate donation against user settings (blacklists, currency, etc.)
- Convert donation to order request
- Publish order to message broker

#### Validation Logic:
```
1. Parse JSON message from WebSocket
2. Extract donation data from Centrifugo message format
3. Look up user in database
4. Validate:
   - Donation amount matches currency settings
   - Donor not in blacklist
   - Video URL not in blacklist
5. Create OrderNew message
6. Publish to RabbitMQ
```

### 4. **User ACL** (`src/acl/user.py`)

Access Control Layer for retrieving authorized users.

#### Responsibilities:
- Request linked accounts from auth service
- Parse user account information with tokens
- Return collection of DAUser objects

### 5. **User Repository** (`src/adapters/_repository/user.py`)

Data access layer for user persistence.

#### Responsibilities:
- CRUD operations on User entities
- Get or create user records
- Persist user-account mappings

---

## Data Models

### DTOs (Data Transfer Objects)

#### LinkedAccountWithTokensRead
```python
class LinkedAccountWithTokensRead(BaseModel):
    id: UUID                          # Unique link ID
    user_id: UUID                     # OpenPlaylist user ID
    platform: Platform                # "da" | "twitch" | "google"
    platform_user_id: str             # DonationAlerts user ID
    access_token: str                 # OAuth access token
    refresh_token: str                # OAuth refresh token
    expires_at: int                   # Token expiration timestamp
```

#### DATokenRefreshed
```python
class DATokenRefreshed(BaseModel):
    user_id: UUID                     # User who refreshed token
    access_token: str                 # New access token
    refresh_token: str | None         # May be None if not refreshed
    expires_at: int                   # New expiration time
```

#### DonationData
```python
class DonationData(BaseModel):
    id: int                           # Donation ID from DonationAlerts
    name: str                         # Donor name
    username: str                     # Donor username
    message: str                      # Donation message (may contain video URL)
    amount: int                       # Donation amount
    currency: str                     # Currency code (USD, EUR, etc.)
    amount_in_user_currency: int      # Converted amount
    recipient: Recipient              # Recipient info
    created_at: str                   # Timestamp
    reason: str                       # Donation reason/type
```

#### OrderNew
```python
class OrderNew(BaseModel):
    request_id: UUID                  # Unique request ID
    owner_id: UUID                    # Playlist owner (from linked account)
    requester_id: int                 # Donation recipient ID
    requester_nickname: str           # Requester display name
    donation_currency_amount: int     # Original donation amount
    yt_video_url: str                 # YouTube URL from donation message
    priority: Literal["d"]            # Priority level
```

### ORM Models

#### User (PostgreSQL)
```python
class User(Base, TimestampMixin):
    __tablename__ = "user"
    
    id: Mapped[str]                   # UUID as string - playlist owner ID
    da_id: Mapped[str]                # DonationAlerts user ID
    created_at: Mapped[datetime]      # Record creation timestamp
    updated_at: Mapped[datetime]      # Last update timestamp
```

---

## Workflow & Flow

### Application Startup Flow

```
1. FastAPI app starts with lifespan context manager
   ├─ Drop existing database (if exists)
   ├─ Create fresh database schema
   ├─ Initialize Manager
   ├─ Start RabbitMQ broker
   ├─ Start Manager (load all users and listeners)
   └─ Connect to Redis

2. Manager startup:
   ├─ Request all linked DonationAlerts accounts from auth service
   └─ For each account:
       ├─ Create DonationAlertsListener instance
       ├─ Start listener (begin WebSocket connection)
       └─ Upsert user in database

3. DonationAlertsListener startup:
   ├─ Check if token needs refresh
   ├─ Get user info and socket token from DA API
   ├─ Connect to Centrifugo WebSocket
   ├─ Authenticate on WebSocket
   └─ Subscribe to donation alerts channel
```

### Donation Receipt & Processing Flow

```
1. Donation Event Received on WebSocket
   │
   └─→ Handler receives message
       ├─ Parse JSON
       ├─ Extract donation data from Centrifugo message format
       │
       └─→ Validation Phase:
           ├─ Look up user in database
           ├─ Check amount vs settings
           ├─ Check donor blacklist
           ├─ Check video blacklist
           │
           └─→ If valid:
               ├─ Create OrderNew DTO
               ├─ Publish to RabbitMQ (bot.da.order.new queue)
               └─ Log success
               
           └─→ If invalid:
               └─ Log and skip donation
```

### New Account Connection Flow

```
1. Auth service sends "bot.da.connect.request" message
   │
   └─→ Handler receives LinkedAccountWithTokensRead
       ├─ Create new DonationAlertsListener
       ├─ Start listener
       ├─ Upsert user in database
       └─ Publish acknowledgment
```

### Token Refresh Flow

```
1. Token expiration detected during WebSocket reconnect
   │
   └─→ DonationAlertsListener._connection_loop()
       ├─ Call refresh_access_token()
       │  ├─ Make POST to DA token endpoint
       │  └─ Receive new tokens
       │
       ├─ Publish DATokenRefreshed to RabbitMQ
       │  └─ Back-end updates database
       │
       └─ Continue with new token
```

---

## Message Queue Integration

### RabbitMQ Queues & Exchange

#### Main Exchange
```
Name: main_exchange
Type: DIRECT
Durable: Yes
```

#### Queue Definitions

| Queue Name | Purpose | Direction | Durability |
|-----------|---------|-----------|-----------|
| `auth.user.da.all.request` | Request all DA linked accounts | RPC Req | Yes |
| `auth.user.da.all.response` | Response with all DA accounts | RPC Res | Yes |
| `auth.user.da.tokens.refreshed` | Notify token refresh | Outbound | Yes |
| `bot.da.connect.request` | New user to connect | Inbound | Yes |
| `bot.da.order.new` | New donation order | Outbound | Yes |
| `bot.da.ack.connection` | Acknowledge connection | Outbound | Yes |

### Message Handlers

#### `bot.da.connect.request` Handler
```python
@rabbit_broker.subscriber(bot_da_connect_request, main_exchange)
async def add_connection(message: RabbitMessage):
    # Deserialize LinkedAccountWithTokensRead
    # Add to Manager
    # Publish acknowledgment
```

---

## Database Schema

### PostgreSQL Schema

#### User Table
```sql
CREATE TABLE "user" (
    id VARCHAR PRIMARY KEY,              -- OpenPlaylist user UUID
    da_id VARCHAR UNIQUE NOT NULL INDEX, -- DonationAlerts user ID
    created_at DATETIME DEFAULT NOW(),
    updated_at DATETIME DEFAULT NOW()
);
```

### Redis Schema

```
Schema: {user_id}:{playlist_name}:settings

Value: JSON serialized PlaylistSettingsDomain
  └─ Contains:
     - min_views, min_likes, max_duration
     - is_active, is_public, is_favorite
     - sort settings
     - costs for different user types
     - blacklists (tracks, users)
```

---

## WebSocket Integration

### Centrifugo Connection Details

**URL**: `wss://centrifugo.donationalerts.com/connection/websocket`

#### Connection Protocol

1. **Authentication**
   ```json
   {
     "params": {
       "token": "<socket_connection_token>"
     },
     "id": 1
   }
   ```

2. **Channel Subscription**
   ```json
   {
     "method": "subscribe",
     "params": {
       "channel": "$alerts:donation_{user_id}"
     },
     "id": 2
   }
   ```

3. **Message Reception**
   - Messages arrive in format:
     ```json
     {
       "result": {
         "channel": "$alerts:donation_{user_id}",
         "data": {
           "data": { /* DonationData */ }
         }
       }
     }
     ```

#### Reconnection Logic

- **Initial delay**: 5 seconds
- **Max delay**: 60 seconds
- **Strategy**: Exponential backoff (doubles on each retry)
- **Trigger events**:
  - WebSocket closed
  - Token expired
  - Network error
  - API error

---

## Deployment

### Docker Image

**Base**: `python:3.13.6-alpine3.22`

**Build Process**:
1. Copy `pyproject.toml` and `.docker.env`
2. Install dependencies with `uv sync --frozen`
3. Copy application code
4. Run `src/main.py` with `uv`

**Key Features**:
- Alpine Linux for minimal size
- `uv` package manager for fast dependency resolution
- Frozen dependency lock for reproducibility

### Environment Variables Required

```bash
# OAuth
APP_ID=<donation_alerts_app_id>
API_KEY=<donation_alerts_api_key>
REDIRECT_URI=https://your-domain.com/callback
SESSION_SECRET_KEY=<secret_key>

# Infrastructure
RABBITMQ_URL=amqp://user:password@rabbitmq:5672/
DB_URL=postgresql+asyncpg://user:password@postgres:5432/bot_da
REDIS_URL=redis://redis:6379

# Optional (defaults provided)
DA_SCOPES=oauth-user-show oauth-donation-subscribe
DA_AUTHORIZATION_URL=https://www.donationalerts.com/oauth/authorize
DA_TOKEN_URL=https://www.donationalerts.com/oauth/token
DA_API_BASE_URL=https://www.donationalerts.com/api/v1
DA_CENTRIFUGO_URL=wss://centrifugo.donationalerts.com/connection/websocket
```

### Docker Compose Integration

Service should be included in `docker-compose.yaml` with:
- PostgreSQL connection
- RabbitMQ connection
- Redis connection
- Proper environment variables

---

## Running & Development

### Local Development

1. **Install Python 3.13+**
   ```bash
   # Using pyenv or system Python
   python --version  # Should be 3.13+
   ```

2. **Install uv**
   ```bash
   pip install uv
   ```

3. **Install dependencies**
   ```bash
   cd bot_da
   uv sync
   ```

4. **Set up environment**
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

5. **Start infrastructure** (PostgreSQL, RabbitMQ, Redis)
   ```bash
   docker-compose up -d postgres rabbitmq redis
   ```

6. **Run service**
   ```bash
   uv run src/main.py
   ```

### Running Tests

```bash
# Tests would go in a test discovery location
# Currently: test.py in bot_da root
uv run pytest test.py
```

### Debugging

Enable debug logging:
```python
# In config.py or environment
logging.basicConfig(level=logging.DEBUG)
```

Monitor WebSocket connections:
```python
# Additional debug output in da_client.py
logger.debug(f"Received message: {message_str}")
```

---

## Key Considerations & Notes

### Token Security
- Tokens are stored in database (not files)
- Refresh tokens handled carefully to avoid exposing to log output
- Token expiration checked before use

### Error Handling
- WebSocket connection failures trigger exponential backoff reconnection
- API errors are logged with status codes
- Invalid tokens trigger refresh attempt before connection close

### Scalability
- Multiple user listeners run concurrently
- Each listener manages its own WebSocket connection
- Manager coordinates all connections

### Performance
- Async/await throughout for high concurrency
- Token caching in memory during connection
- Redis for optional settings caching
- Database queries use connection pooling

### Future Enhancements
- Playlist settings caching from Redis (currently commented out)
- More granular donation validation
- Metrics/monitoring integration
- Graceful shutdown handlers
- Health check endpoints

---

## Troubleshooting

### Common Issues

**Issue**: Service won't connect to DonationAlerts
- **Check**: Verify APP_ID, API_KEY, and REDIRECT_URI are correct
- **Check**: Token in database is valid and not expired
- **Check**: Network connectivity to DonationAlerts servers

**Issue**: Donations not being received
- **Check**: WebSocket connection is active (check logs)
- **Check**: Correct user_id in subscription channel
- **Check**: Token hasn't expired mid-connection

**Issue**: Database errors
- **Check**: DB_URL is correct and service is running
- **Check**: Schema created successfully on startup

**Issue**: RabbitMQ queue errors
- **Check**: RABBITMQ_URL is correct
- **Check**: Queues are declared before publishing

---

## Related Services

- **Back-end**: Processes orders from bot_da
- **Auth Service**: Manages OAuth connections and tokens
- **Bot TTV**: Similar service for Twitch integration
- **Bot DA**: This service (DonationAlerts integration)

---

**Last Updated**: April 2026
**Python Version**: 3.13
**Status**: Active Development
