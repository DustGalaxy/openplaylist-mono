# Playback History & Analytics System Architecture

This document describes the track history ingestion pipeline, automated retention cleanup, metrics aggregation, and analytics querying in **OpenPlaylist**.

---

## 1. Architecture Overview

The history subsystem captures playback events to generate aggregate performance and viewership metrics for streamers and users.

1. **Asynchronous Playback Logging (FastStream Worker `history_handler.py`):**
   - Subscribes to the central event exchange `playlist_fanout_exchange`.
   - Intercepts `InternalPlaylistEvent` with type `TRACK_PLAY`.
   - Safely records occurrences via `PlaybackHistoryRepository.upsert_entry()` without blocking the real-time audio playback stream.

2. **History Storage & Retention (PostgreSQL + Taskiq Cleanup):**
   - Database model `playback_history`: Associates `user_id`, `playlist_id`, `order_id` (track), and timestamp `played_at`.
   - Automated Cleanup: Scheduled Taskiq cron job (`src/tasks/history.py`) purges expired records older than $N$ days (`clean_old_history`).

3. **Analytics Service (`stats_routes.py` / `StatsRepository`):**
   - Configurable Time Windows (`TimeWindow`): `LAST_24H` (24 hours), `LAST_7D` (7 days), `LAST_30D` (30 days), `ALL_TIME` (all historical data).
   - Core Metrics:
     - Total playback duration (in seconds/hours).
     - Top popular tracks (frequency ranking).
     - Top ordering users (by donation volume or priority).

---

## 2. System Diagrams

### 2.1. History Collection & Analytics Data Flow Diagram

```mermaid
flowchart TB
    subgraph PlaybackEventSource ["Playback Execution"]
        PlayEvent["Track Play Event<br/><i>InternalPlaylistEventType.TRACK_PLAY</i>"]
    end

    subgraph MessagingBus ["RabbitMQ Event Bus"]
        Fanout["playlist_fanout_exchange"]
    end

    subgraph HistoryPipeline ["Async History Pipeline"]
        HistoryWorker["History Worker<br/><i>history_handler.py</i>"]
        HistoryRepo["PlaybackHistoryRepository<br/><i>src/dal/postgres/history.py</i>"]
        CleanupTask["Taskiq Cron Task<br/><i>src/tasks/history.py</i>"]
    end

    subgraph StatsPipeline ["Analytics Engine"]
        StatsRoutes["Stats & History Routes<br/><i>/history, /stats</i>"]
        StatsRepo["StatsRepository<br/><i>src/dal/postgres/stats.py</i>"]
    end

    subgraph Storage ["PostgreSQL Database"]
        HistoryTable[("playback_history Table")]
    end

    subgraph UI ["React Frontend"]
        HistoryPage["History Page<br/><i>/routes/history.tsx</i>"]
        StatsWidget["HistoryStatsWidget.tsx"]
    end

    %% Flow connections
    PlayEvent -->|1. Publish TRACK_PLAY| Fanout
    Fanout -->|2. Consume Event| HistoryWorker
    HistoryWorker -->|3. Upsert Entry| HistoryRepo
    HistoryRepo -->|4. INSERT / UPDATE| HistoryTable

    CleanupTask -->|5. Delete Records > N Days| HistoryRepo

    HistoryPage -->|6. GET /history| StatsRoutes
    StatsWidget -->|6. GET /stats?window=LAST_7D| StatsRoutes
    
    StatsRoutes -->|7. Aggregate SQL Queries| StatsRepo
    StatsRepo -->|8. SELECT & GROUP BY| HistoryTable
    StatsRoutes -->|9. Render Graphs & Tables| UI
```

---

### 2.2. Sequence Diagram: Playback History Upsert

```mermaid
sequenceDiagram
    autonumber
    actor Player as Owner Player
    participant Rabbit as RabbitMQ (playlist_fanout_exchange)
    participant Worker as FastStream (history_handler.py)
    participant Repo as PlaybackHistoryRepository
    participant DB as PostgreSQL (playback_history)

    Player->>Rabbit: Trigger TRACK_PLAY (InternalPlaylistEvent)
    Rabbit->>Worker: history_event_subscriber(event)
    Worker->>Worker: Validate track.id and user_id presence
    
    Worker->>Repo: upsert_entry(session, user_id, order_id, playlist_id)
    Repo->>DB: INSERT INTO playback_history ON CONFLICT DO UPDATE (played_at = now())
    DB-->>Worker: OK
    Note over Worker: Playback asynchronously recorded in analytics database.
```

---

### 2.3. Sequence Diagram: Statistics Query

```mermaid
sequenceDiagram
    autonumber
    actor User as User / Streamer
    participant UI as React UI (HistoryStatsWidget)
    participant API as FastAPI (/stats?time_window=LAST_7D)
    participant StatsRepo as StatsRepository
    participant DB as PostgreSQL

    User->>UI: Open stats page & select "7 Days"
    UI->>API: GET /stats?time_window=LAST_7D
    API->>API: Calculate start_date (now() - 7 days)
    
    API->>StatsRepo: get_top_tracks(db_session, user_id, start_date)
    StatsRepo->>DB: SELECT order_id, COUNT(*) GROUP BY order_id ORDER BY count DESC LIMIT 10
    
    API->>StatsRepo: get_total_duration(db_session, user_id, start_date)
    StatsRepo->>DB: SELECT SUM(duration) FROM playback_history JOIN order
    
    DB-->>API: Aggregated Metrics Data
    API-->>UI: 200 OK (JSON with top_tracks, total_duration, top_requesters)
    Note over UI: Render analytics charts and metric cards.
```

---

### 2.4. History Entry State Machine

```mermaid
stateDiagram-v2
    [*] --> EventFired: Track starts playing
    
    EventFired --> WorkerConsuming: Received by history handler
    WorkerConsuming --> CheckingDuplicate: Check existing user track entry
    
    CheckingDuplicate --> CreatedNew: Entry does not exist
    CheckingDuplicate --> UpdatedTimestamp: Entry already exists
    
    CreatedNew --> ActiveInStats: Inserted to PostgreSQL
    UpdatedTimestamp --> ActiveInStats: Updated played at timestamp

    state "Retention and Cleanup" as Retention {
        ActiveInStats --> WithinRetention: Age within 30 Days
        ActiveInStats --> Expired: Age over 30 Days
    }

    Expired --> Purged: Deleted by Taskiq Cron Job
    Purged --> [*]
```

---

## 3. Schema & Endpoint Specifications

### 3.1. Entity Schema `playback_history`

- `id`: UUID (Primary Key).
- `user_id`: UUID (Foreign Key -> `auth_user.id`).
- `playlist_id`: UUID (Foreign Key -> `playlist.id`).
- `order_id`: UUID (Foreign Key -> `order.id`).
- `played_at`: Timestamp (Indexed).

### 3.2. Time Windows (`TimeWindow` Enum)

- `LAST_24H`: Trailing 24-hour interval.
- `LAST_7D`: Trailing 7-day interval.
- `LAST_30D`: Trailing 30-day interval.
- `ALL_TIME`: Complete historical aggregate.
