# Playback System Architecture

This document describes the playback synchronization architecture, user roles, data structures, event-driven message pipeline (RabbitMQ FastStream + Socket.IO), and frontend-backend interaction across `/back-end` and `/new_ui`.

---

## 1. Architecture Overview

The playback system is built upon three core design principles:
1. **Single Leader Model:** Only the **Playlist Owner** acts as the single source of truth for active playback progression.
2. **Unified Event-Driven Pipeline (RabbitMQ $\rightarrow$ FastStream $\rightarrow$ Socket.IO):** Playback operations utilize the central RabbitMQ message bus (`main_publisher.publish`), maintaining parity with all other domain events (`playnow`, `track_added`, `settings_changed`).
3. **Isolated Persistence Layer (Redis DAL Repository):** High-frequency position updates and pause toggles are cached directly in Redis Hash structures via `src/dal/_redis/playback_repository.py` without burdening PostgreSQL.

---

## 2. System Diagrams

### 2.1. Component Data Flow Diagram

```mermaid
flowchart TB
    subgraph Frontend ["/new_ui Web Client & Widgets"]
        OwnerUI["Playlist Owner / Moderator (Operator)<br/><i>usePlaybackFeed.ts</i>"]
        ViewerUI["Viewer / Listener (Viewer)<br/><i>createPlaylistCacheSlice.ts</i>"]
        OBSWidget["OBS Stream Widget<br/><i>/widget Namespace</i>"]
    end

    subgraph Backend ["/back-end FastAPI & Services"]
        API["FastAPI Routes<br/><i>/playback/{id}/state/*</i>"]
        Service["Playback Service<br/><i>playback_service.py</i>"]
        DAL["Redis DAL Repository<br/><i>playback_repository.py</i>"]
    end

    subgraph Messaging ["RabbitMQ & FastStream Workers"]
        Publisher["RabbitMQ Publisher<br/><i>main_publisher.publish()</i>"]
        Exchange["RabbitMQ Exchange & Queues<br/><i>playback.pause / playback.seek</i>"]
        Worker["FastStream Worker<br/><i>playback_handler.py</i>"]
    end

    subgraph Realtime ["Realtime WebSockets"]
        SIOPlaylist["Socket.IO Playlist Namespace<br/><i>/plst_upds</i>"]
        SIOWidget["Socket.IO Widget Namespace<br/><i>/widget</i>"]
    end

    subgraph Storage ["Redis Cache"]
        Redis[("Redis Hash: playback:playlist_id")]
    end

    %% Flow connections
    OwnerUI -->|1. HTTP POST /pause, /seek, /position| API
    API -->|2. State persistence| Service
    Service -->|3. HSET / HGET| DAL
    DAL -->|4. Store Hash| Redis

    API -->|5. Publish Event| Publisher
    Publisher -->|6. Queue Message| Exchange
    Exchange -->|7. Consume Event| Worker

    Worker -->|8a. Emit playback_pause / seek| SIOPlaylist
    Worker -->|8b. Emit pause / seek| SIOWidget

    SIOPlaylist -->|9a. Realtime Sync Event| ViewerUI
    SIOWidget -->|9b. Overlay Update| OBSWidget
```

---

## 2.2. Sequence Diagram: Pause / Resume

```mermaid
sequenceDiagram
    autonumber
    actor Owner as Owner / Moderator
    participant UI as React UI (usePlaybackFeed)
    participant API as FastAPI (/playback/state/pause)
    participant DAL as Redis PlaybackRepository
    participant Rabbit as RabbitMQ (main_publisher)
    participant FS as FastStream Worker (playback_handler)
    participant SIO as Socket.IO Server (/plst_upds & /widget)
    actor Viewer as Viewer (acceptSync: true)
    actor OBS as OBS Stream Overlay

    Owner->>UI: Toggle Play/Pause
    UI->>API: POST /playback/{playlist_id}/state/pause (is_paused, position, track_id, client_id)
    API->>DAL: save_state(playlist_id, data)
    DAL-->>API: OK (Redis Hash updated)
    API->>Rabbit: main_publisher.publish(PlaybackPauseEvent, queue=playback_pause)
    API-->>UI: 200 OK

    Rabbit->>FS: playback_pause_subscriber(event)
    FS->>SIO: sio_playlist_service.pause(playlist_id, state)
    FS->>SIO: sio_widget_service.pause(user_id, state)

    SIO->>Viewer: Emit playback_pause:{playlist_id}
    Note over Viewer: Echo filter: incoming.client_id !== CLIENT_ID.<br/>If acceptSync: true -> pause audio.

    SIO->>OBS: Emit pause
    Note over OBS: Update stream overlay state.
```

---

## 2.3. Sequence Diagram: Seek & Heartbeat

```mermaid
sequenceDiagram
    autonumber
    actor Owner as Owner / Moderator
    participant UI as React UI (usePlaybackFeed)
    participant API as FastAPI (/playback/state/seek or /position)
    participant DAL as Redis PlaybackRepository
    participant Rabbit as RabbitMQ (main_publisher)
    participant FS as FastStream Worker (playback_handler)
    participant SIO as Socket.IO Server (/plst_upds)
    actor Viewer as Viewer (acceptSync: true)

    alt User Action: Seek Timeline
        Owner->>UI: Drag timeline position
        UI->>API: POST /playback/{playlist_id}/state/seek (position, track_id, client_id)
    else Background Heartbeat (every 5 seconds)
        UI->>API: POST /playback/{playlist_id}/state/position (position, client_id)
    end

    API->>DAL: save_state(playlist_id, data)
    API->>Rabbit: main_publisher.publish(PlaybackSeekEvent, queue=playback_seek)
    API-->>UI: 200 OK

    Rabbit->>FS: playback_seek_subscriber(event)
    FS->>SIO: sio_playlist_service.seek(playlist_id, state)
    SIO->>Viewer: Emit playback_seek:{playlist_id}
    Note over Viewer: Verify acceptSync: true -> synchronize currentTime.
```

---

## 2.4. Role Behavior Matrix

```mermaid
stateDiagram-v2
    [*] --> Unauthenticated
    
    state "Playlist Owner (Single Leader)" as Owner {
        [*] --> Broadcasting: opens playlist & plays track
        Broadcasting --> SendingHeartbeat: every 5 seconds
        Broadcasting --> EmittingPauseSeek: user clicks pause/seek
    }
    
    state "Moderator (Assistant)" as Mod {
        [*] --> CheckMode
        CheckMode --> RemoteControl: isRemoteControlMode = true
        RemoteControl --> EmittingAsOwner: REST API skip_owner_check=true
        CheckMode --> LocalListener: acceptSync = false
    }

    state "Guest / Viewer" as Viewer {
        [*] --> CheckSync
        CheckSync --> SyncedMode: acceptSync = true
        SyncedMode --> FollowingLeader: receives WebSocket events
        CheckSync --> AutonomousMode: acceptSync = false
        AutonomousMode --> IndependentAudio: ignores leader events
    }
```

---

## 3. Component & Layer Specifications

### 3.1. Redis Data Layer (DAL Repository)
- **Source File**: `src/dal/_redis/playback_repository.py`
- **Key Schema**: Redis Hash `playback:{playlist_id}` (TTL: 3 days / 259,200 seconds).
- **Hash Fields**:
  - `is_paused`: Pause indicator flag ("1" / "0").
  - `position`: Current audio offset in seconds (float string, e.g. "42.5").
  - `track_id`: UUID of the active track.

### 3.2. Messaging Layer (RabbitMQ & FastStream)
- **Exchange** (`src/adapters/_rabbit/queues.py`): `main_exchange` (Direct Exchange).
- **Queues**:
  - `playback.pause` (`playback_pause_queue`)
  - `playback.seek` (`playback_seek_queue`)
- **DTO Schemas** (`src/dto/playback.py`):
  - `PlaybackPauseEvent`: `playlist_id`, `user_id`, `state: Pause`
  - `PlaybackSeekEvent`: `playlist_id`, `user_id`, `state: Seek`
- **Publisher**: `main_publisher.publish(..., exchange=main_exchange)` (`src/adapters/_rabbit/broker.py`)
- **Consumer**: `@router.subscriber(queue, main_exchange)` in `src/adapters/_rabbit/worker/playback_handler.py`

### 3.3. Client Layer (Frontend `/new_ui`)
- **Primary Hook**: `usePlaybackFeed.ts` (`src/features/player/hooks/usePlaybackFeed.ts`)
- **State Store**: `createPlaylistCacheSlice.ts` (`src/stores/playlistStore/createPlaylistCacheSlice.ts`)
- **Anti-Echo Filter**: Each client instance generates a unique `CLIENT_ID`. If an incoming event carries `client_id === CLIENT_ID`, the initiator ignores the echo event to avoid infinite playback feedback loops.
