# Playlist Logs & Audit System Architecture

This document describes the event logging architecture, operator action recording, audit persistence, and real-time log distribution in **OpenPlaylist**.

---

## 1. Architecture Overview

The audit logging subsystem ensures operational transparency, enabling playlist owners and moderators to monitor management actions in real time.

1. **Asynchronous Event Ingestion (`logs_handler.py`):**
   - The FastStream worker subscribes to the domain event bus `playlist_fanout_exchange` (queue `internal.playlist.log`).
   - Intercepts all domain events (`TRACK_ADDED`, `TRACK_REJECTED`, `TRACK_REMOVED`, `TRACK_PLAY`, `TRACK_SKIPPED`, `SETTINGS_CHANGED`, etc.).
   - Extracts operator metadata (`_get_operator_payload`): username, ID, and authorization level (`owner`, `moderator`, `none`).

2. **Log Service & Dual Dispatch (`playlist_log_service.py`):**
   - Method `log_and_emit()` executes two consecutive operations:
     1. **Persistence:** Writes `PlaylistLogSchema` into PostgreSQL table `playlist_logs`.
     2. **Realtime Broadcast:** Invokes `sio_playlist_service.log()`, emitting Socket.IO event `log:{playlist_id}` to connected owners and moderators.

3. **Frontend Audit Interface (`LogPanel.tsx`):**
   - The log panel in `new_ui` listens to live `log:{playlist_id}` broadcasts and paginates through historical records via REST API `GET /playlist/{playlist_id}/logs`.

---

## 2. System Diagrams

### 2.1. Audit Logging Data Flow Diagram

```mermaid
flowchart TB
    subgraph DomainEventSource ["Playlist Action Origin"]
        UserAction["User / Operator Action<br/><i>Add, Skip, Delete, Change Settings</i>"]
    end

    subgraph MessagingBus ["RabbitMQ Event Bus"]
        Fanout["playlist_fanout_exchange<br/><i>internal.playlist.log</i>"]
    end

    subgraph LogPipeline ["Log Processing Engine"]
        LogsWorker["Logs Worker<br/><i>logs_handler.py</i>"]
        OperatorParser["Operator Parser<br/><i>_get_operator_payload()</i>"]
        LogSvc["PlaylistLogService<br/><i>playlist_log.py</i>"]
    end

    subgraph PersistenceAndRealtime ["Storage & Delivery"]
        DB[("PostgreSQL Database<br/><i>playlist_logs Table</i>")]
        SIO["Socket.IO Server<br/><i>log:{playlist_id}</i>"]
    end

    subgraph UI ["React Frontend"]
        LogPanel["Realtime Log Panel<br/><i>LogPanel.tsx</i>"]
    end

    %% Flow connections
    UserAction -->|1. Publish InternalPlaylistEvent| Fanout
    Fanout -->|2. Consume Event| LogsWorker
    LogsWorker -->|3. Extract Operator Info| OperatorParser
    LogsWorker -->|4. Call log_and_emit| LogSvc

    LogSvc -->|5a. Save Audit Record| DB
    LogSvc -->|5b. Emit Live Log Event| SIO
    
    SIO -->|6. Realtime Log Stream| LogPanel
```

---

### 2.2. Sequence Diagram: Audit Log Processing & Broadcast

```mermaid
sequenceDiagram
    autonumber
    actor Mod as Moderator (Operator)
    participant UI as React UI (LogPanel)
    participant API as FastAPI (/playlist/{id}/track/skip)
    participant Rabbit as RabbitMQ (playlist_fanout_exchange)
    participant Worker as FastStream (logs_handler.py)
    participant LogSvc as PlaylistLogService
    participant DB as PostgreSQL (playlist_logs)
    participant SIO as Socket.IO Server (/plst_upds)
    actor Owner as Playlist Owner

    Mod->>UI: Action: Skip Track
    UI->>API: POST /playlist/{id}/track/skip
    API->>Rabbit: Publish InternalPlaylistEvent (TRACK_SKIPPED + EventOperator)
    API-->>UI: 200 OK

    Rabbit->>Worker: _subscriber(event)
    Worker->>Worker: Extract op_payload (nickname, access_level: moderator)
    Worker->>LogSvc: log_and_emit(db_session, user_id, playlist_id, event_type, data)
    
    LogSvc->>DB: INSERT INTO playlist_logs (event_type, payload, created_at)
    LogSvc->>SIO: sio_playlist_service.log(PlaylistLogSchema)
    
    SIO->>Owner: Emit log:{playlist_id} (PlaylistLogSchema)
    SIO->>Mod: Emit log:{playlist_id} (PlaylistLogSchema)
    Note over Owner, Mod: Instant audit entry badge displaying [Moderator Nickname].
```

---

### 2.3. Sequence Diagram: Historical Log Query

```mermaid
sequenceDiagram
    autonumber
    actor Owner as Owner / Moderator
    participant UI as React UI (LogPanel.tsx)
    participant API as FastAPI (GET /playlist/{playlist_id}/logs)
    participant LogSvc as PlaylistLogService
    participant DB as PostgreSQL (playlist_logs)

    Owner->>UI: Open audit logs panel
    UI->>API: GET /playlist/{playlist_id}/logs?page=1&limit=50
    API->>LogSvc: get_playlist_logs(db_session, playlist_id, limit, offset)
    LogSvc->>DB: SELECT * FROM playlist_logs WHERE playlist_id = :id ORDER BY created_at DESC
    DB-->>LogSvc: List[PlaylistLogDomain]
    LogSvc-->>API: ReadPlaylistLogDTO list
    API-->>UI: 200 OK (JSON Array of Logs)
    Note over UI: Paginated log entries rendered in UI.
```

---

### 2.4. Log Event Classification

```mermaid
stateDiagram-v2
    [*] --> EventCaptured: InternalPlaylistEvent Received
    
    state "Operator Classification" as OperatorType {
        [*] --> CheckOperator
        CheckOperator --> OwnerOp: owner
        CheckOperator --> ModeratorOp: moderator
        CheckOperator --> PublicUserOp: none or requester
    }

    state "Event Type Classification" as LogEventType {
        [*] --> MatchEventType
        MatchEventType --> AddTrackLog: TRACK_ADDED
        MatchEventType --> RemoveTrackLog: TRACK_REMOVED
        MatchEventType --> SkipTrackLog: TRACK_SKIPPED
        MatchEventType --> SettingsLog: SETTINGS_CHANGED
        MatchEventType --> RejectTrackLog: TRACK_REJECTED
    }

    OperatorType --> WriteToDatabase: Combine Operator & Event Data
    LogEventType --> WriteToDatabase
    WriteToDatabase --> EmitSocketIO: Broadcast Live Log
    EmitSocketIO --> [*]
```

---

## 3. Data Model Specifications

### 3.1. Entity Schema `playlist_logs`
- `id`: UUID (Primary Key).
- `user_id`: UUID (Playlist owner ID).
- `playlist_id`: UUID (Foreign Key -> `playlist.id`).
- `event_type`: Enum (`ADD_TRACK`, `DELETE_TRACK`, `SKIP_TRACK`, `REJECT_TRACK`, `CHANGE_SETTINGS`, `BULK_DELETE_TRACKS`, `PLAY_NOW`).
- `payload`: JSONB Object:
  ```json
  {
    "title": "Song Title",
    "id": "yt_video_id",
    "platform": "youtube",
    "operator": {
      "nickname": "ModNickname",
      "access_level": "moderator",
      "user_id": "uuid-mod-id"
    }
  }
  ```
- `created_at`: Timestamp.

### 3.2. Access Control
- Historical log queries (`GET /playlist/{id}/logs`) are restricted to the **Playlist Owner** and **Moderators**.
- The realtime stream `log:{playlist_id}` is routed only to authenticated administrative clients.
