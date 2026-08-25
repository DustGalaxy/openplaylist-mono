# Order & Track Request Pipeline Architecture

This document describes the track request intake, validation, priority calculation, queue scheduling, and transition lifecycle in the **OpenPlaylist** platform.

---

## 1. Architecture Overview

The order subsystem orchestrates the complete lifecycle of user track submissions—from arrival via Web UI or donation bots to active playback and historical analytics logging.

1. **Order Intake & Initialization (`order_service.py`):**
   - Media metadata extraction (YouTube ID, title, duration, author, platform source).
   - Support for single track submissions and batch operations (`start_from_target`).
   - Rule-based validation against playlist constraints (allowed sources `allow_sources`, blacklist filters `track_black_list`, maximum capacity `max_playlist_size`).

2. **Asynchronous Order Ingestion (FastStream Worker `order.proccess`):**
   - Inbound requests enter the durable RabbitMQ queue `order.proccess` (`main_exchange`).
   - The FastStream worker (`order_proccess_handler.py`) persists tracks in batches to PostgreSQL via `add_to_playlist_batch`.
   - Emits an asynchronous domain event `InternalPlaylistEvent` (`event_type: TRACK_ADDED`) into `playlist_fanout_exchange`.

3. **Track Transitions & Broadcast:**
   - On track changes (`playnow`, `next`, `skip`), the worker dispatches `InternalPlaylistEvent` to `playlist_fanout_exchange`.
   - `callback_handler.py` consumes the event and broadcasts Socket.IO client updates: `add_track`, `delete_track`, `playnow`.
   - `history_handler.py` records finished tracks into `playback_history` for analytics aggregation.

---

## 2. System Diagrams

### 2.1. Order Processing Data Flow Diagram

```mermaid
flowchart TB
    subgraph Sources ["Order Sources"]
        WebUI["Web Client<br/><i>order_routes.py</i>"]
        DonationBots["Donation Bots<br/><i>DA / Twitch / DonateX</i>"]
    end

    subgraph API ["FastAPI & Messaging"]
        OrderRoutes["Order Routes<br/><i>/order/{playlist_id}</i>"]
        RabbitMain["RabbitMQ Main Exchange<br/><i>order.proccess queue</i>"]
    end

    subgraph Workers ["FastStream Processing Pipeline"]
        OrderWorker["Order Worker<br/><i>order_proccess_handler.py</i>"]
        OrderSvc["Order Service<br/><i>order_service.py</i>"]
        FanoutExchange["RabbitMQ Fanout Exchange<br/><i>playlist_fanout_exchange</i>"]
    end

    subgraph Handlers ["Domain Event Subscribers"]
        CallbackHandler["Callback Handler<br/><i>callback_handler.py</i>"]
        HistoryHandler["History Handler<br/><i>history_handler.py</i>"]
        LogHandler["Logs Handler<br/><i>logs_handler.py</i>"]
    end

    subgraph RealtimeUI ["Realtime UI & DB"]
        SIO["Socket.IO Server<br/><i>add_track, delete_track, playnow</i>"]
        DB[("PostgreSQL Database")]
        ReactUI["React Playlist UI"]
    end

    %% Flow connections
    WebUI -->|1. POST /order/playlist_id| OrderRoutes
    DonationBots -->|1. Publish Order Payload| RabbitMain
    OrderRoutes -->|2. Publish to order.proccess| RabbitMain

    RabbitMain -->|3. Consume Order Payload| OrderWorker
    OrderWorker -->|4. Parse & Validate| OrderSvc
    OrderWorker -->|5. Save Tracks| DB
    OrderWorker -->|6. Publish InternalPlaylistEvent| FanoutExchange

    FanoutExchange -->|7a. Emit WebSocket| CallbackHandler
    FanoutExchange -->|7b. Log Playback History| HistoryHandler
    FanoutExchange -->|7c. Audit Log| LogHandler

    CallbackHandler -->|8. SIO Emit| SIO
    SIO -->|9. Realtime Update| ReactUI
```

---

### 2.2. Sequence Diagram: Order Processing

```mermaid
sequenceDiagram
    autonumber
    actor User as User / Donator
    participant UI as React UI / Bot
    participant API as FastAPI (/order/{playlist_id})
    participant Rabbit as RabbitMQ (main_exchange)
    participant Worker as FastStream (order_proccess_handler)
    participant DB as PostgreSQL
    participant Fanout as RabbitMQ (playlist_fanout_exchange)
    participant SIO as Socket.IO Server (/plst_upds)
    actor Viewers as All Playlist Viewers

    User->>UI: Submit link or search track
    UI->>API: POST /order/{playlist_id} (NewOrderPayload)
    API->>Rabbit: main_publisher.publish(payload, queue=order.proccess)
    API-->>UI: 202 Accepted ("order queued for processing")

    Rabbit->>Worker: _subscriber(payload)
    Worker->>Worker: init_orders (parse URL & params)
    Worker->>DB: add_to_playlist_batch (save tracks)
    
    Worker->>Fanout: main_publisher.publish(InternalPlaylistEvent: TRACK_ADDED)
    
    Fanout->>SIO: callback_router (callback_handler.py)
    SIO->>Viewers: Emit add_track:{playlist_id} (OrderDomain)
    Note over Viewers: Realtime display of new queued track in UI.
```

---

### 2.3. Sequence Diagram: Track Transition & Event Broadcast

```mermaid
sequenceDiagram
    autonumber
    actor Player as Player Owner (UI)
    participant UI as React UI (usePlaybackFeed)
    participant API as FastAPI (/playlist/{id}/playnow or /next)
    participant DB as PostgreSQL
    participant Fanout as RabbitMQ (playlist_fanout_exchange)
    participant Callback as callback_handler.py
    participant History as history_handler.py
    participant SIO as Socket.IO Server

    Player->>UI: Track playback finished (onEnded)
    UI->>API: POST /playlist/{id}/playnow (track_id)
    API->>DB: UPDATE current_playing_track
    
    API->>Fanout: Publish InternalPlaylistEvent (TRACK_PLAY / TRACK_LISTENED)
    
    par Independent Domain Subscribers
        Fanout->>Callback: TRACK_LISTENED
        Callback->>SIO: delete_track / playnow
        SIO->>Player: Emit playnow:{playlist_id}
    and Playback History Recording
        Fanout->>History: TRACK_PLAY
        History->>DB: upsert_entry (playback_history)
    end
```

---

### 2.4. Order Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> Submitted: Order Received via REST or Bot
    Submitted --> QueuedInRabbit: Publish to order process queue
    
    state "Processing Pipeline" as Pipeline {
        QueuedInRabbit --> Validating: FastStream Worker consumes order
        Validating --> Blacklisted: Track in blacklist or domain restricted
        Validating --> Accepted: Validation Passed
    }
    
    Blacklisted --> Rejected: Return Error and Refund
    Accepted --> InPlaylistQueue: Saved to PostgreSQL and Emitted via Socket.IO
    
    state "Playback Queue" as Queue {
        InPlaylistQueue --> CurrentlyPlaying: Triggered via playnow or auto-next
        CurrentlyPlaying --> Completed: Played to the end
        CurrentlyPlaying --> Skipped: Skipped by Owner or Moderator
        CurrentlyPlaying --> Deleted: Removed from queue by Moderator
    }

    Completed --> HistoryLogged: Recorded in playback history
    Skipped --> HistoryLogged
    Deleted --> [*]
    HistoryLogged --> [*]
```

---

## 3. Order Data Models

### 3.1. Entity Schema `OrderDomain` / `track_data`
- `id`: UUID primary key.
- `playlist_id`: UUID.
- `yt_video_id`: String (Video/audio provider identifier).
- `title`: String.
- `author`: String.
- `duration`: Float (Seconds).
- `source`: Enum (`youtube`, `vk`, `web`, etc.).
- `from_owner`: Boolean (Whether ordered by the playlist owner).
- `requester_nickname`: String | None.
- `priority`: Integer (Calculated score based on donation value or user role).
- `created_at`: Timestamp.
