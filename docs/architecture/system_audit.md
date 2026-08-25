# System Architecture Audit: Connections, Event Streams & Critical Path Analysis

This document provides an architectural audit of service relationships across the **OpenPlaylist Mono** repository (`new_ui`, `back-end`, `bot_ttv`, `RabbitMQ`, `Redis`, `PostgreSQL`, `Twitch API`), detailing data streams, messaging topologies, and operational resilience.

---

## 1. System Interaction Diagrams

### Diagram 1: Authentication & Streamer Onboarding Flow

```mermaid
sequenceDiagram
    autonumber
    actor Streamer as Streamer (DustGalaxy)
    actor Admin as System Administrator
    participant UI as new_ui / Admin View
    participant BE as back-end (FastAPI)
    participant DB as PostgreSQL
    participant RMQ as RabbitMQ (main_exchange)
    participant Bot as bot_ttv (TwitchIO 3)
    participant Twitch as Twitch Helix / EventSub

    Note over Admin,Bot: 1. Service Bot Account Authorization
    Admin->>UI: /admin/twitch_auth (Preset "Bot Account")
    UI->>Twitch: OAuth (user:bot, user:write:chat, user:read:chat)
    Twitch-->>BE: Callback -> Persist tokens
    BE->>DB: TwitchAdminToken (is_active=True)
    BE->>RMQ: Publish "bot.twitch.connect.request" (Tokens DTO)
    RMQ->>Bot: bot.add_token() [Registered as bot_id: 1014404886]

    Note over Streamer,Bot: 2. Streamer Channel Connection
    Streamer->>UI: Login via Twitch (Scopes: channel:bot, redemptions)
    UI->>BE: /auth/twitch/callback
    BE->>DB: LinkedAccount + TokenVault
    BE->>RMQ: Publish "bot.twitch.connect.request" (Tokens DTO)
    RMQ->>Bot: bot.add_token() + bot.multi_subscribe()
    Bot->>Twitch: Subscriptions: ChatMessage + ChannelPointsRedeemAdd
    Bot->>Twitch: get_or_create_channel_reward() (Automated points reward provisioning)
```

---

### Diagram 2: Channel Points Track Order Processing

```mermaid
sequenceDiagram
    autonumber
    actor Viewer as Chat Viewer
    participant Twitch as Twitch EventSub / Helix
    participant Bot as bot_ttv
    participant Redis as Redis Cache
    participant RMQ as RabbitMQ
    participant BE as back-end (Worker)
    participant DB as PostgreSQL
    participant SIO as Socket.IO (Widget / UI)

    Viewer->>Twitch: Redeem "Music Request" reward (YouTube URL)
    Twitch->>Bot: WebSocket -> event_custom_redemption_add
    Bot->>Redis: Check status (!mr points on/off)
    
    alt Invalid URL or Orders Disabled
        Bot->>Twitch: payload.refund() (Immediate points refund)
        Bot->>Twitch: Chat error notification
    else Valid Order
        Bot->>RMQ: bot_twitch_order_new (TTVNewOrder + reward_id + redemption_id)
        RMQ->>BE: "order.proccess" (NewOrderPayload)
        BE->>BE: order_service.init_orders() (Extract YouTube video info)
        BE->>BE: validate_track() (Blacklist filters, duration caps)
        BE->>DB: Save track into playlist
        BE->>SIO: TRACK_ADDED -> Update stream overlay widget
        
        Note over BE,Bot: Asynchronous Feedback Stage
        BE-->>RMQ: Publish "bot.order.completed" / "bot.order.cancelled" (OrderUpdate)
        RMQ-->>Bot: order_status() handler
        Bot-->>Twitch: patch_custom_reward_redemption (FULFILLED / CANCELED)
        Bot-->>Twitch: Send chat reply: "@viewer Track successfully added!"
    end
```

---

### Diagram 3: Distributed Messaging Architecture

```mermaid
graph TD
    subgraph Frontend & Clients
        UI[new_ui React / Vite]
        AdminUI[SQLAdmin /admin]
        Widget[OBS Overlay / Widget]
        TwitchChat[Twitch Chat & Channel Points]
    end

    subgraph Messaging & Cache
        RMQ_MAIN[RabbitMQ: main_exchange]
        RMQ_FANOUT[RabbitMQ: playlist_fanout_exchange]
        RMQ_USER[RabbitMQ: user_fanout_exchange]
        REDIS[(Redis Cache / State)]
    end

    subgraph Backend Core
        API[FastAPI Web Server]
        Worker[Order Process Worker]
        CallbackWorker[Callback & SIO Worker]
        DB[(PostgreSQL)]
    end

    subgraph Microservices
        BotTTV[bot_ttv - TwitchIO 3]
        BotDA[bot_da - DonationAlerts]
        BotDX[bot_donatex - DonateX]
    end

    UI -->|HTTP / REST| API
    AdminUI -->|HTTP / OAuth| API
    Widget <-->|Socket.IO| API
    TwitchChat <-->|WebSocket EventSub / Helix| BotTTV

    API -->|Save Tokens / Users| DB
    Worker -->|Save Orders / Tracks| DB

    BotTTV -->|bot_twitch_order_new| RMQ_MAIN
    RMQ_MAIN -->|order.proccess| Worker
    Worker -->|TRACK_ADDED / REJECTED| RMQ_FANOUT
    RMQ_FANOUT --> CallbackWorker
    CallbackWorker -->|Socket.IO emit| Widget

    Worker -.->|bot.order.completed / cancelled| RMQ_MAIN
    RMQ_MAIN -.->|OrderUpdate| BotTTV

    BotTTV <-->|Reward IDs / On-Off Flags| REDIS
```

---

## 2. RabbitMQ Message & Event Matrix

| Queue / Topic | Exchange | DTO | Producer | Consumer | Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `bot.twitch.order.new` | `main_exchange` (DIRECT) | `TTVNewOrder` | `bot_ttv` | `back-end` | Dispatch Twitch chat/reward orders to backend. |
| `order.proccess` | `main_exchange` (DIRECT) | `NewOrderPayload` | `back-end` | `back-end` (Worker) | Ingestion and playlist rule validation pipeline. |
| `internal.playlist.callback` | `playlist_fanout` (FANOUT) | `InternalPlaylistEvent` | `Worker` | `CallbackWorker` | Dispatch Socket.IO live updates to UI and OBS. |
| `bot.twitch.connect.request` | `main_exchange` (DIRECT) | `Tokens` | `back-end` | `bot_ttv` | Onboard streamer bot connection dynamically. |
| `bot.twitch.disconnect` | `main_exchange` (DIRECT) | `str` (user_id) | `back-end` | `bot_ttv` | Remove channel subscriptions on account unlink. |
| `auth.user.twitch.tokens.refreshed` | `main_exchange` (DIRECT) | `TwitchTokenRefreshed` | `bot_ttv` | `back-end` | Update renewed OAuth credentials in database. |
| `bot.order.completed` | `main_exchange` (DIRECT) | `OrderUpdate` | `back-end` (Worker) | `bot_ttv` | Order accepted, fulfill Channel Points reward. |
| `bot.order.cancelled` | `main_exchange` (DIRECT) | `OrderUpdate` | `back-end` (Worker) | `bot_ttv` | Order rejected, cancel/refund Channel Points. |

---

## 3. System Strengths & Security Audit

1. **Granular OAuth Scopes:** Streamers authorize strictly `channel:bot` and channel points scopes; identity rights to speak on behalf of the streamer are segregated.
2. **Dedicated Administration:** `/admin/twitch_auth` maintains specialized presets for bot accounts (`user:bot`, `user:write:chat`), broadcasting tokens via RabbitMQ.
3. **Automated Reward Management:** Automatic provisioning of custom Channel Points rewards with resilient recovery from Redis cache drops.
4. **Resilient URL Parsing:** Regex extractors isolate video IDs from arbitrary chat sentences and normalize canonical YouTube URLs.
