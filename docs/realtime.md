# Подсистема реального времени и Socket.IO (Realtime & Socket.IO Engine)

Документация описывает архитектуру мультинеймспейсного Socket.IO сервера, авторизацию соединений по JWT-кукам, управление комнатами и доставку событий в проекте **OpenPlaylist**.

---

## 1. Архитектурный обзор (Architecture Overview)

Подсистема обеспечивают двусторонний обмен данными между бекендом, веб-клиентом и стрим-оверлеями.

1. **Иерархия Неймспейсов (Namespaces)**:
   - **`/plst_upds` (`SioPlaylistUpdateService`)**: Основной канал работы приложения. Отвечает за трансляцию добавлений, удалений, переходов треков, изменения настроек плейлиста и синхронизацию плейбека (`playback_pause`, `playback_seek`).
   - **`/widget` (`SioWidgetService`)**: Канал оверлеев стриминга (OBS, Twitch). Транслирует текущий трек `current_track`, паузу и перемотку.
   - **`/` (Root Namespace)**: Системный неймспейс для подтверждения интеграций ботов (`ack_bot_connected`).

2. **Авторизация соединений по JWT**:
   - Каждое соединение наследовано от `BaseNamespace`.
   - Извлечение JWT-токена происходит из HTTP-кук (`HTTP_COOKIE`).
   - При успешном декодировании сессия сохраняется в Socket.IO session, а связь `user_id <-> SID` кэшируется в Redis (`playlist:users:{user_id}` или `widget:users:{user_id}`).

3. **Управление комнатами (`sio_room_manager.py`)**:
   - Комнаты плейлистов: `str(playlist_id)` — подписка на очереди и настройки.
   - Комнаты плейбека: `playback:{playlist_id}` — подписка на синхронизацию плеера.
   - Комнаты виджетов: `widget:users:{user_id}` — подписка виджетов владельца.

---

## 2. Графики и диаграммы взаимодействия (System Diagrams)

### 2.1. Компонентный график неймспейсов и комнат (Data Flow Diagram)

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

### 2.2. Диаграмма последовательности: Подключение и подписка на комнату (Connect & Subscribe)

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
    
    alt Доступ разрешен (Public / Owner / Mod / Anon)
        SIO->>Room: enter_room(sid, playlist_id)
        SIO-->>Client: emit("subscribe_success")
    else Доступ запрещен (Private playlist)
        SIO-->>Client: emit("subscribe_denied", {room_id})
    end
```

---

### 2.3. Диаграмма последовательности: Перевод в приватный режим и изгнание слушателей (Kicking & Privacy)

```mermaid
sequenceDiagram
    autonumber
    actor Owner as Владелец плейлиста
    participant API as FastAPI (PATCH /playlist/{id})
    participant Rabbit as RabbitMQ (playlist_privacy_private)
    participant SIO as Socket.IO (/plst_upds)
    participant Room as RoomManager
    actor Guest as Изгоняемый Гость

    Owner->>API: Изменение статуса: is_public = false
    API->>Rabbit: Publish InternalPlaylistEvent (PLAYLIST_PRIVACY_PRIVATE)
    
    Rabbit->>SIO: set_private(data)
    SIO->>SIO: Get owner_sid from Redis
    
    loop Для каждого SID в комнате playlist_id
        alt SID != owner_sid
            SIO->>Guest: emit("kicked_from_playlist")
            SIO->>Room: leave_room(sid, room_id)
            Note over Guest: Принудительный отключ от обновлений плейлиста
        end
    end
```

---

### 2.4. Жизненный цикл Socket.IO сессии (Session Lifecycle)

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

## 3. Спецификация событий Socket.IO

### 3.1. События Неймспейса `/plst_upds`
- **Входящие (Client $\rightarrow$ Server)**:
  - `sub_plst_upds`: Вход в комнату обновлений очереди плейлиста.
  - `unsub_plst_upds`: Выход из комнаты обновлений.
  - `sub_playback`: Вход в комнату синхронизации воспроизведения.
  - `unsub_playback`: Выход из комнаты синхронизации.
- **Исходящие (Server $\rightarrow$ Client)**:
  - `subscribe_success` / `subscribe_denied`
  - `playback_subscribe_success` / `playback_subscribe_denied`
  - `add_track:{playlist_id}`: Добавление нового трека в очередь.
  - `delete_track:{playlist_id}`: Удаление трека.
  - `bulk_delete_tracks:{playlist_id}`: Массовое удаление.
  - `playnow:{playlist_id}`: Переключение активного трека.
  - `playback_pause:{playlist_id}`: Событие паузы/резюма.
  - `playback_seek:{playlist_id}`: Событие перемотки.
  - `settings_changed:{playlist_id}`: Изменение настроек.
  - `kicked_from_playlist`: Изгнание при приватизации.

### 3.2. События Неймспейса `/widget`
- `current_track`: Данные о текущем треке для оверлея стрима (title, yt_video_id, platform, by_owner).
- `pause`: Статус паузы для виджета.
- `seek`: Позиция перемотки для виджета.
