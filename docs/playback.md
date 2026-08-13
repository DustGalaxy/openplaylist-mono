# Система управления воспроизведением (Playback System Architecture)

Документация описывает архитектуру, роли, структуру данных, событийно-ориентированный пайплайн (RabbitMQ FastStream + Socket.IO) и взаимодействие интерфейсов `/backend` и `/new_ui`.

---

## 1. Архитектурный обзор (Architecture Overview)

Архитектура системы построена на трех фундаментальных принципах:
1. **Модель Единственного Лидера (Single Leader)**: Только **Владелец плейлиста (Owner)** является главным источником правды для активного проигрывания.
2. **Единый Event-Driven пайплайн (RabbitMQ $\rightarrow$ FastStream $\rightarrow$ Socket.IO)**: Управление воспроизведением использует ту же брокерную шину RabbitMQ (`main_publisher.publish`), что и остальные доменные события системы (`playnow`, `track_added`, `settings_changed`).
3. **Изолированный слой данных (Redis DAL Repository)**: Высокочастотные изменения позиции и статуса паузы кешируются в Redis Hash через репозиторий `src/dal/_redis/playback_repository.py` без нагрузки на PostgreSQL.

---

## 2. Графики и диаграммы взаимодействия (System Diagrams)

### 2.1. Компонентный график потоков данных (Data Flow Diagram)

```mermaid
flowchart TB
    subgraph Frontend ["/new_ui Web Client & Widgets"]
        OwnerUI["Владелец / Модератор (Operator)<br/><i>usePlaybackFeed.ts</i>"]
        ViewerUI["Слушатель (Viewer)<br/><i>createPlaylistCacheSlice.ts</i>"]
        OBSWidget["OBS Stream Widget<br/><i>/widget Namespace</i>"]
    end

    subgraph Backend ["/backend FastAPI & Services"]
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

### 2.2. Диаграмма последовательности: Пауза / Резюм (Sequence Diagram - Pause/Resume)

```mermaid
sequenceDiagram
    autonumber
    actor Owner as Владелец / Модератор
    participant UI as React UI (usePlaybackFeed)
    participant API as FastAPI (/playback/state/pause)
    participant DAL as Redis PlaybackRepository
    participant Rabbit as RabbitMQ (main_publisher)
    participant FS as FastStream Worker (playback_handler)
    participant SIO as Socket.IO Server (/plst_upds & /widget)
    actor Viewer as Гость (acceptSync: true)
    actor OBS as OBS Stream Overlay

    Owner->>UI: Клик Пауза / Возобновление
    UI->>API: POST /playback/{playlist_id}/state/pause (is_paused, position, track_id, client_id)
    API->>DAL: save_state(playlist_id, data)
    DAL-->>API: OK (Redis Hash updated)
    API->>Rabbit: main_publisher.publish(PlaybackPauseEvent, queue=playback_pause)
    API-->>UI: 200 OK

    Rabbit->>FS: playback_pause_subscriber(event)
    FS->>SIO: sio_playlist_service.pause(playlist_id, state)
    FS->>SIO: sio_widget_service.pause(user_id, state)

    SIO->>Viewer: Emit playback_pause:{playlist_id}
    Note over Viewer: Фильтрация: incoming.client_id !== CLIENT_ID.<br/>Если acceptSync: true -> пауза плеера.

    SIO->>OBS: Emit pause
    Note over OBS: Обновление оверлея стрима.
```

---

### 2.3. Диаграмма последовательности: Перемотка и Heartbeat (Sequence Diagram - Seek & Position)

```mermaid
sequenceDiagram
    autonumber
    actor Owner as Владелец / Модератор
    participant UI as React UI (usePlaybackFeed)
    participant API as FastAPI (/playback/state/seek or /position)
    participant DAL as Redis PlaybackRepository
    participant Rabbit as RabbitMQ (main_publisher)
    participant FS as FastStream Worker (playback_handler)
    participant SIO as Socket.IO Server (/plst_upds)
    actor Viewer as Гость (acceptSync: true)

    alt Действие пользователя: Перемотка (Seek)
        Owner->>UI: Перетаскивание таймлайна (Seek)
        UI->>API: POST /playback/{playlist_id}/state/seek (position, track_id, client_id)
    else Фоновый Heartbeat (каждые 5 сек)
        UI->>API: POST /playback/{playlist_id}/state/position (position, client_id)
    end

    API->>DAL: save_state(playlist_id, data)
    API->>Rabbit: main_publisher.publish(PlaybackSeekEvent, queue=playback_seek)
    API-->>UI: 200 OK

    Rabbit->>FS: playback_seek_subscriber(event)
    FS->>SIO: sio_playlist_service.seek(playlist_id, state)
    SIO->>Viewer: Emit playback_seek:{playlist_id}
    Note over Viewer: Проверка acceptSync: true -> корректировка currentTime.
```

---

### 2.4. Матрица ролей и вариантов использования (Role Behavior Matrix)

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

## 3. Спецификация слоев и компонентов

### 3.1. Слой данных Redis (DAL Repository)
- **Файл**: `src/dal/_redis/playback_repository.py`
- **Структура ключа**: Redis Hash `playback:{playlist_id}` (TTL: 3 дня / 259200 секунд).
- **Поля Hash**:
  - `is_paused`: Флаг паузы ("1" / "0").
  - `position`: Текущая секунда трека (float строка, e.g. "42.5").
  - `track_id`: UUID текущего воспроизводимого трека.

### 3.2. Событийный слой RabbitMQ & FastStream
- **Exchange** (`src/adapters/_rabbit/queues.py`): `main_exchange` (Direct Exchange)
- **Очереди**:
  - `playback.pause` (`playback_pause_queue`)
  - `playback.seek` (`playback_seek_queue`)
- **События** (`src/dto/playback.py`):
  - `PlaybackPauseEvent`: `playlist_id`, `user_id`, `state: Pause`
  - `PlaybackSeekEvent`: `playlist_id`, `user_id`, `state: Seek`
- **Издатель**: `main_publisher.publish(..., exchange=main_exchange)` (`src/adapters/_rabbit/broker.py`)
- **Обработчик (FastStream Worker)**: `@router.subscriber(queue, main_exchange)` в `src/adapters/_rabbit/worker/playback_handler.py`


### 3.3. Клиентский слой (Frontend `/new_ui`)
- **Основной хук**: `usePlaybackFeed.ts` (`src/features/player/hooks/usePlaybackFeed.ts`)
- **Стор состояний**: `createPlaylistCacheSlice.ts` (`src/stores/playlistStore/createPlaylistCacheSlice.ts`)
- **Фильтрация зацикливания**: Каждый клиент генерирует уникальный `CLIENT_ID`. Если полученный эвент `client_id === CLIENT_ID`, эвент игнорируется.
