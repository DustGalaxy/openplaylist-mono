# Realtime Engine & Socket.IO Architecture

This document describes the multi-namespace Socket.IO server architecture, cookie-based JWT authentication, dynamic room routing, and event distribution in the **OpenPlaylist** platform.

---

## 1. Architecture Overview

The realtime engine powers low-latency, bidirectional communication between the backend, client single-page applications, and streaming broadcast overlays.

1. **Namespace Hierarchy:**
   - **`/plst_upds` (`SioPlaylistUpdateService`):** Primary operational channel. Broadcasts queue additions, deletions, track advances, playlist configuration mutations, and playback synchronization (`playback_pause`, `playback_seek`).
   - **`/widget` (`SioWidgetService`):** Dedicated stream overlay channel (OBS Studio, Twitch widgets). Dispatches `current_track`, pause toggles, and seek adjustments.
   - **`/` (Root Namespace):** System signaling for bot integration acknowledgments (`ack_bot_connected`).

2. **Cookie-Based JWT Session Authentication:**
   - Every namespace inherits from `BaseNamespace`.
   - Extracts and verifies JWT session tokens from HTTP cookies (`HTTP_COOKIE`).
   - On successful handshake, the session is registered in the Socket.IO session store, and the `user_id <-> SID` mapping is indexed in Redis (`playlist:users:{user_id}` or `widget:users:{user_id}`).

3. **Dynamic Room Management (`sio_room_manager.py`):**
   - Playlist Rooms: `str(playlist_id)` — Queue mutations and settings subscriptions.
   - Playback Rooms: `playback:{playlist_id}` — Audio/video synchronization subscriptions.
   - Widget Rooms: `widget:users:{user_id}` — Streamer overlay broadcast targets.

---

## 2. System Diagrams

### 2.1. Namespace & Room Topology Diagram

```mermaid
flowchart TB
    subgraph Clients ["Client Layer"]
        WebPlayer["Web Player (/new_ui)<br/><i>playlistStore / usePlaybackFeed</i>"]
        StreamOverlay["OBS Stream Overlay<br/><i>Widget Page</i>"]
    end

    subgraph SIOAdapter ["Socket.IO Server (python-socketio)"]
        BaseNS["BaseNamespace<br/><i>Cookie JWT Auth</i>"]
        PlstNS["/plst_upds Namespace<br/><i>SioPlaylistUpdateService</i>"]
        WidgetNS["/widget Namespace<br/><i>SioWidgetService</i>"]
        RoomMgr["Room Manager<br/><i>sio_room_manager.py</i>"]
    end

    subgraph FastStreamWorkers ["FastStream Event Workers"]
        CallbackWorker["callback_handler.py"]
        PlaybackWorker["playback_handler.py"]
        WidgetWorker["widget_handler.py"]
    end

    subgraph RedisCache ["Redis State"]
        SIDCache[("Hash: playlist:users:user_id")]
    end

    %% Flow connections
    WebPlayer -->|1. Connect with Cookie| PlstNS
    StreamOverlay -->|1. Connect with Cookie| WidgetNS
    
    PlstNS -->|2. Authenticate| BaseNS
    WidgetNS -->|2. Authenticate| BaseNS
    BaseNS -->|3. Register SID| SIDCache

    WebPlayer -->|4. sub_plst_upds / sub_playback| PlstNS
    PlstNS -->|5. Join Room| RoomMgr

    FastStreamWorkers -->|6. Emit Domain Events| PlstNS
    FastStreamWorkers -->|6. Emit Overlay Events| WidgetNS

    PlstNS -->|7. Push Events to Room| WebPlayer
    WidgetNS -->|7. Push Current Track| StreamOverlay
```

---

### 2.2. Sequence Diagram: Connection & Room Subscription

```mermaid
sequenceDiagram
    autonumber
    actor Client as Web Client (/new_ui)
    participant SIO as Socket.IO (/plst_upds)
    participant Auth as BaseNamespace (_authenticate_via_cookie)
    participant Redis as Redis Cache
    participant Room as RoomManager (room_manager)
    participant DB as PostgreSQL

    Client->>SIO: Connect request (Cookie: auth=JWT)
    SIO->>Auth: _authenticate_via_cookie(sid, environ)
    Auth->>Auth: Decode JWT & verify expiration
    Auth->>Redis: HSET playlist:users:{user_id} sid {sid}
    SIO-->>Client: Connection Established (connect_success)

    Client->>SIO: emit("sub_plst_upds", {playlist_id})
    SIO->>DB: Check playlist privacy & owner
    
    alt Access Granted (Public / Owner / Moderator / Anon)
        SIO->>Room: enter_room(sid, playlist_id)
        SIO-->>Client: emit("subscribe_success")
    else Access Denied (Private playlist)
        SIO-->>Client: emit("subscribe_denied", {room_id})
    end
```

---

### 2.3. Sequence Diagram: Playlist Privatization & Listener Eviction

```mermaid
sequenceDiagram
    autonumber
    actor Owner as Playlist Owner
    participant API as FastAPI (PATCH /playlist/{id})
    participant Rabbit as RabbitMQ (playlist_privacy_private)
    participant SIO as Socket.IO (/plst_upds)
    participant Room as RoomManager
    actor Guest as Evicted Viewer

    Owner->>API: Update status: is_public = false
    API->>Rabbit: Publish InternalPlaylistEvent (PLAYLIST_PRIVACY_PRIVATE)
    
    Rabbit->>SIO: set_private(data)
    SIO->>SIO: Get owner_sid from Redis
    
    loop For each SID in room playlist_id
        alt SID != owner_sid
            SIO->>Guest: emit("kicked_from_playlist")
            SIO->>Room: leave_room(sid, room_id)
            Note over Guest: Forced disconnection from private queue updates
        end
    end
```

---

### 2.4. Socket.IO Session Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Disconnected
    
    Disconnected --> Connecting: WebSocket Handshake with Cookie
    Connecting --> Authenticated: JWT Validated & SID Cached in Redis
    Connecting --> AuthFailed: JWT Missing or Expired

    state "Active Connection" as Active {
        Authenticated --> SubscribedToUpdates: emit sub_plst_upds
        Authenticated --> SubscribedToPlayback: emit sub_playback
        SubscribedToUpdates --> ReceivingEvents: listens to track and settings updates
        SubscribedToPlayback --> ReceivingPlayback: listens to playback pause and seek
    }

    Active --> Disconnecting: Client leaves page or Network drop
    Disconnecting --> Cleanup: _clean_redis_session
    Cleanup --> Disconnected
```

---

## 3. Socket.IO Event Specifications

### 3.1. `/plst_upds` Namespace Events
- **Client $\rightarrow$ Server**:
  - `sub_plst_upds`: Join playlist queue mutation room.
  - `unsub_plst_upds`: Leave queue mutation room.
  - `sub_playback`: Join playback sync room.
  - `unsub_playback`: Leave playback sync room.
- **Server $\rightarrow$ Client**:
  - `subscribe_success` / `subscribe_denied`
  - `playback_subscribe_success` / `playback_subscribe_denied`
  - `add_track:{playlist_id}`: Track added to queue.
  - `delete_track:{playlist_id}`: Track removed from queue.
  - `bulk_delete_tracks:{playlist_id}`: Bulk deletion event.
  - `playnow:{playlist_id}`: Active playing track transition.
  - `playback_pause:{playlist_id}`: Play/pause state change.
  - `playback_seek:{playlist_id}`: Timeline seek event.
  - `settings_changed:{playlist_id}`: Playlist rule modifications.
  - `kicked_from_playlist`: Eviction notification when playlist goes private.

### 3.2. `/widget` Namespace Events
- `current_track`: Active track payload for stream overlay (title, yt_video_id, platform, by_owner).
- `pause`: Stream widget pause indicator.
- `seek`: Stream widget seek synchronization.
