# Подсистема логов и аудита плейлистов (Playlist Logs & Audit System)

Документация описывает архитектуру системы логирования событий плейлиста, фиксации действий операторов/модераторов, хранения аудита и трансляции в режиме реального времени в **OpenPlaylist**.

---

## 1. Архитектурный обзор (Architecture Overview)

Подсистема аудит-логов обеспечивает прозрачность управления плейлистом и позволяет владельцу и модераторам отслеживать все операционные действия в реальном времени.

1. **Асинхронный перехват событий (`logs_handler.py`)**:
   - Воркер FastStream подписывается на доменную шину `playlist_fanout_exchange` (очередь `internal.playlist.log`).
   - Перехватывает все доменные события (`TRACK_ADDED`, `TRACK_REJECTED`, `TRACK_REMOVED`, `TRACK_PLAY`, `TRACK_SKIPPED`, `SETTINGS_CHANGED` и др.).
   - Извлекает метаданные оператора (`_get_operator_payload`): имя, ID и уровень прав (`owner`, `moderator`, `none`).

2. **Сервис логов и двойная доставка (`playlist_log_service.py`)**:
   - Метод `log_and_emit()` выполняет две последовательные операции:
     1. **Персистентность**: Запись структуры `PlaylistLogSchema` в таблицу `playlist_logs` (PostgreSQL).
     2. **Realtime-вещание**: Вызов `sio_playlist_service.log()`, который отправляет Socket.IO эвент `log:{playlist_id}` на клиенты владельца и модераторов.

3. **Интерфейс аудита на фронтенде (`LogPanel.tsx`)**:
   - Панель логов в `new_ui` подписывается на события `log:{playlist_id}` и подгружает исторический журнал через REST API `GET /playlist/{playlist_id}/logs`.

---

## 2. Графики и диаграммы взаимодействия (System Diagrams)

### 2.1. Компонентный график логирования и вещания (Data Flow Diagram)

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

### 2.2. Диаграмма последовательности: Фиксация и отображение лога (Audit Log Flow)

```mermaid
sequenceDiagram
    autonumber
    actor Mod as Модератор (Operator)
    participant UI as React UI (LogPanel)
    participant API as FastAPI (/playlist/{id}/track/skip)
    participant Rabbit as RabbitMQ (playlist_fanout_exchange)
    participant Worker as FastStream (logs_handler.py)
    participant LogSvc as PlaylistLogService
    participant DB as PostgreSQL (playlist_logs)
    participant SIO as Socket.IO Server (/plst_upds)
    actor Owner as Владелец плейлиста

    Mod->>UI: Действие: Пропуск трека (Skip)
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
    Note over Owner, Mod: Мгновенное появление записи лога с пометкой [Moderator Nickname].
```

---

### 2.3. Диаграмма последовательности: Загрузка исторического журнала (History Query Sequence)

```mermaid
sequenceDiagram
    autonumber
    actor Owner as Владелец / Модератор
    participant UI as React UI (LogPanel.tsx)
    participant API as FastAPI (GET /playlist/{playlist_id}/logs)
    participant LogSvc as PlaylistLogService
    participant DB as PostgreSQL (playlist_logs)

    Owner->>UI: Открытие панели логов
    UI->>API: GET /playlist/{playlist_id}/logs?page=1&limit=50
    API->>LogSvc: get_playlist_logs(db_session, playlist_id, limit, offset)
    LogSvc->>DB: SELECT * FROM playlist_logs WHERE playlist_id = :id ORDER BY created_at DESC
    DB-->>LogSvc: List[PlaylistLogDomain]
    LogSvc-->>API: ReadPlaylistLogDTO list
    API-->>UI: 200 OK (JSON Array of Logs)
    Note over UI: Отрисовка списка историй с пагинацией.
```

---

### 2.4. Типы событий и классификация операторов (Log Event Classification)

```mermaid
stateDiagram-v2
    [*] --> EventCaptured: InternalPlaylistEvent Received
    
    state "Классификация оператора" as OperatorType {
        [*] --> CheckOperator
        CheckOperator --> OwnerOp: owner
        CheckOperator --> ModeratorOp: moderator
        CheckOperator --> PublicUserOp: none or requester
    }

    state "Классификация типа лога" as LogEventType {
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

## 3. Детальная спецификация моделей логов

### 3.1. Структура таблицы `playlist_logs`
- `id`: UUID (Primary Key).
- `user_id`: UUID (ID владельца плейлиста).
- `playlist_id`: UUID (Foreign Key -> `playlist.id`).
- `event_type`: Enum (`ADD_TRACK`, `DELETE_TRACK`, `SKIP_TRACK`, `REJECT_TRACK`, `CHANGE_SETTINGS`, `BULK_DELETE_TRACKS`, `PLAY_NOW`).
- `payload`: JSONB Объект:
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

### 3.2. Права доступа к логам
- Получать исторические логи (`GET /playlist/{id}/logs`) могут только **Владелец** и **Модераторы** с соответствующим уровнем доступа.
- Живой поток `log:{playlist_id}` транслируется в Socket.IO только авторизованным администраторам плейлиста.
