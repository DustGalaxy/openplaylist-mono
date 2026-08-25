# Playlist & Permissions System Architecture

This document describes the playlist lifecycle architecture, configurable playback modes, moderator role-based access control (RBAC), and invite token mechanics in the **OpenPlaylist** platform.

---

## 1. Architecture Overview

The playlist subsystem encompasses custom queue construction, playback constraints, and granular access delegation:

1. **Playlist Configuration & Operating Modes (Playlist Settings):**
   - **Playback Modes (`mode`):**
     - `stream`: Dynamic user donation/order stream with blacklist validation and background track failovers (`background_track_ids`).
     - `static`: Fixed, predefined ordered track list.
   - **Order Cost Calculation (`cost_mode`):** `add` (cumulative sum) or `max` (highest bid selection).
   - **Source Restrictions (`allow_sources`):** Allowed media providers (YouTube, VK, Web, etc.).
   - **Blacklists and Background Music:** `track_black_list` and `background_track_ids`.

2. **Moderation System & RBAC:**
   - **Single Owner:** Retains absolute administrative control over settings, moderators, queues, and playback streams.
   - **Moderators:** Authenticated users granted granular permissions:
     - `can_manage_queue`: Add, reorder, delete, and approve queued tracks.
     - `can_manage_playback`: Remote playback control (pause, resume, seek, Remote Control mode).
     - `can_manage_settings`: Modify playlist parameters (modes, sources, filters).
   - **Invitation Links (Moderator Tokens):** Cryptographic single-use or reusable invite tokens with expiration limits (`expires_at`).

3. **FastAPI Authorization Guard (`MODERATOR_ACCESS`):**
   - Dependency `get_playlist_moderator_access`: extracts tokens from `X-Moderator-Token` header or query parameter `token`, verifies session identity, and calculates active capabilities (`ModeratorAccessInfo`).

---

## 2. System Diagrams

### 2.1. Component Architecture (Data Flow Diagram)

```mermaid
flowchart TB
    subgraph Client ["/new_ui Client Interface"]
        UI["React Playlist UI<br/><i>usePlaylistAccess.ts</i>"]
        SettingsModal["Settings Modal<br/><i>TabBasic.tsx / TabModerators.tsx</i>"]
    end

    subgraph API ["FastAPI Adapters"]
        PlstRoutes["Playlist Routes<br/><i>/playlist/*</i>"]
        ModRoutes["Moderator Routes<br/><i>/moderator/*</i>"]
        DepMod["Dependency<br/><i>MODERATOR_ACCESS</i>"]
    end

    subgraph Service ["Playlist & Moderator Business Logic"]
        PlstSvc["PlaylistService<br/><i>basic_service.py</i>"]
        ModSvc["ModeratorService<br/><i>moderator_service.py</i>"]
        RulesSvc["RulesService<br/><i>rules_service.py</i>"]
    end

    subgraph DB ["PostgreSQL Database"]
        PlstRepo[("Playlist Table")]
        ModRepo[("PlaylistModerator Table")]
        UserRepo[("AuthUser Table")]
    end

    subgraph RealtimeBus ["RabbitMQ & Socket.IO Bus"]
        Publisher["RabbitMQ Publisher<br/><i>playlist_fanout_exchange</i>"]
        SIO["Socket.IO Server<br/><i>settings_changed:{id}</i>"]
    end

    %% Flow connections
    UI -->|1. Fetch / Update Playlist| PlstRoutes
    SettingsModal -->|2. Manage Moderators / Tokens| ModRoutes
    
    PlstRoutes -->|3. Validate Permissions| DepMod
    DepMod -->|4. Resolve Access Info| ModSvc

    PlstRoutes -->|5. Apply Settings Patch| PlstSvc
    ModRoutes -->|6. CRUD Moderator Tokens| ModSvc

    PlstSvc -->|7. Persist to DB| PlstRepo
    ModSvc -->|8. Persist Moderators| ModRepo

    PlstSvc -->|9. Publish PLAYLIST_SETTINGS_CHANGED| Publisher
    Publisher -->|10. Emit WebSocket Update| SIO
    SIO -->|11. Sync UI Settings| UI
```

---

### 2.2. Sequence Diagram: Moderator Token Creation & Activation

```mermaid
sequenceDiagram
    autonumber
    actor Owner as Playlist Owner
    actor ModUser as Guest / Future Moderator
    participant UI as React UI (TabModerators)
    participant API as FastAPI (/playlist/{id}/moderators/token)
    participant ModSvc as ModeratorService
    participant DB as PostgreSQL (playlist_moderator)

    Owner->>UI: Create invite (select permissions & exp_time)
    UI->>API: POST /playlist/{id}/moderators/token (permissions, expires_at)
    API->>ModSvc: create_moderator_token(...)
    ModSvc->>ModSvc: Generate cryptographic token (secrets.token_urlsafe)
    ModSvc->>DB: INSERT INTO playlist_moderator (token, is_activated=false)
    API-->>UI: 200 OK + invite_link (e.g. /playlist/id?token=XYZ)

    Note over Owner, ModUser: Transfer link to moderator
    ModUser->>UI: Navigate to invite URL
    UI->>API: POST /playlist/{id}/moderators/accept?token=XYZ
    API->>ModSvc: accept_moderator_token(token, mod_user_id)
    ModSvc->>DB: UPDATE playlist_moderator (user_id=mod_user_id, is_activated=true, token=null)
    API-->>UI: 200 OK (Moderator account linked)
```

---

### 2.3. Sequence Diagram: Playlist Patch & Realtime Sync

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Owner / Moderator (can_manage_settings)
    participant UI as React UI (SettingsModal)
    participant API as FastAPI (PATCH /playlist/{id})
    participant Dep as MODERATOR_ACCESS
    participant PlstSvc as PlaylistService
    participant DB as PostgreSQL
    participant Rabbit as RabbitMQ (main_publisher)
    participant SIO as Socket.IO Server (/plst_upds)
    actor Viewers as Playlist Listeners

    Admin->>UI: Modify playback mode / rules / blacklist
    UI->>API: PATCH /playlist/{playlist_id} (PlaylistPatch payload)
    API->>Dep: get_playlist_moderator_access(playlist_id)
    Dep-->>API: ModeratorAccessInfo (can_manage_settings = true)
    
    API->>PlstSvc: patch_playlist(playlist_id, patch_schema)
    PlstSvc->>DB: UPDATE playlist & playlist_settings
    
    PlstSvc->>Rabbit: main_publisher.publish(PLAYLIST_SETTINGS_CHANGED, playlist_fanout_exchange)
    API-->>UI: 200 OK (ReadPlaylist)

    Rabbit->>SIO: FastStream worker (log_router / callback_router)
    SIO->>Viewers: Emit settings_changed:{playlist_id} (Partial<Playlist>)
    Note over Viewers: Realtime client UI rule synchronization.
```

---

### 2.4. Access Control Hierarchy

```mermaid
stateDiagram-v2
    [*] --> AnonymousRequest

    state "Guest / Anonymous Viewer" as Anon {
        [*] --> CheckPublic
        CheckPublic --> PublicAccess: Playlist is public
        PublicAccess --> ViewTracks: View tracks and listen
        CheckPublic --> DenyAccess: Playlist is private
    }

    state "Authenticated User" as AuthGuest {
        [*] --> CheckOwnerOrMod
        CheckOwnerOrMod --> CanRequestTracks: Submit orders
    }

    state "Moderator (Staff)" as Mod {
        [*] --> CheckPermissions
        CheckPermissions --> QueueOps: Manage queue enabled
        CheckPermissions --> PlaybackOps: Manage playback enabled
        CheckPermissions --> SettingsOps: Manage settings enabled
    }

    state "Playlist Owner" as Owner {
        [*] --> FullAccess: Unrestricted administrative authority
    }
```

---

## 3. Data Model Specifications

### 3.1. Entity Schema `playlist_moderator`

- `id`: UUID primary key.
- `playlist_id`: UUID (Foreign Key -> `playlist.id`).
- `user_id`: UUID | None (Populated upon token acceptance).
- `token`: String | None (Cryptographic single-use/multi-use string).
- `permissions`: JSONB Object:

  ```json
  {
    "can_manage_queue": true,
    "can_manage_playback": true,
    "can_manage_settings": false
  }
  ```

- `is_activated`: Boolean.
- `expires_at`: Timestamp | None.

### 3.2. Authorization Enforcement in API Routes

- **Owner Resolution**: `is_owner = True` $\rightarrow$ sets all permissions in `ModeratorAccessInfo` to `True`.
- **Route Guard Example**:

  ```python
  if not access.permissions.get("can_manage_settings", False):
      raise HTTPException(status_code=403, detail="Moderator missing required permissions")
  ```

---

## 4. Playlist Tags & Discovery

Playlists support normalized tags (`ARRAY(String)` in PostgreSQL) for indexing and discovery:

### 4.1. Validation & Normalization Rules
- Leading `#` symbols and surrounding whitespace are stripped automatically.
- Tags are lowercased for case-insensitive search.
- Max tag length: 30 characters.
- Max tags per playlist: 10 tags.
- Duplicate tags are eliminated while preserving original order.

### 4.2. Endpoints
- `GET /playlist?query={query}&tag={tag}`: Search public playlists with substring filtering across name, description, author, and tags. Returns `ReadPlaylistPreview` with `tags`.
- `GET /playlist/tags/popular?limit=20`: Retrieves the most frequent tags among public playlists with usage counters (`tag`, `count`).
- `POST /playlist`: Create a new playlist including `tags: list[str]`.
- `PATCH /playlist/{id}`: Update playlist tags via `tags: list[str]`.
