# Подсистема заказов и обработки треков (Order & Track Request Pipeline)

Документация описывает архитектуру приема, валидации, расчета приоритетов, обработки и смены треков в проекте **OpenPlaylist**.

---

## 1. Архитектурный обзор (Architecture Overview)

Подсистема отвечает за жизненный цикл музыкальных заказов: от момента создания пользователем или донат-ботом до воспроизведения и логирования.

1. **Прием и инициализация заказов (`order_service.py`)**:
   - Извлечение метаданных (YouTube ID, названия, длительности, автора, источника).
   - Поддержка единичных заказов и батчей (`start_from_target`).
   - Валидация по правилам плейлиста (разрешенные источники `allow_sources`, черные списки `track_black_list`, максимальный размер плейлиста `max_playlist_size`).

2. **Асинхронная обработка заказов (FastStream Worker `order.proccess`)**:
   - Сообщения заказов попадают в очередь `order.proccess` (`main_exchange`).
   - FastStream воркер (`order_proccess_handler.py`) батчами сохраняет треки в БД через `add_to_playlist_batch`.
   - Публикация событийно-ориентированного события `InternalPlaylistEvent` (`event_type: TRACK_ADDED`) в `playlist_fanout_exchange`.

3. **Смена состояний трека и вещание**:
   - При смене трека (`playnow`, `next`, `skip`) воркер выбивает событие `InternalPlaylistEvent` в `playlist_fanout_exchange`.
   - `callback_handler.py` подписывается на событие и отправляет клиентские Socket.IO команды: `add_track`, `delete_track`, `playnow`.
   - `history_handler.py` фиксирует прослушивание трека в истории (`playback_history`).

---

## 2. Графики и диаграммы взаимодействия (System Diagrams)

### 2.1. Компонентный график обработки заказов (Data Flow Diagram)

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

### 2.2. Диаграмма последовательности: Создание заказа (Order Processing Sequence)

```mermaid
sequenceDiagram
    autonumber
    actor User as Пользователь / Донатер
    participant UI as React UI / Bot
    participant API as FastAPI (/order/{playlist_id})
    participant Rabbit as RabbitMQ (main_exchange)
    participant Worker as FastStream (order_proccess_handler)
    participant DB as PostgreSQL
    participant Fanout as RabbitMQ (playlist_fanout_exchange)
    participant SIO as Socket.IO Server (/plst_upds)
    actor Viewers as Все слушатели плейлиста

    User->>UI: Ввод ссылки/поиск трека
    UI->>API: POST /order/{playlist_id} (NewOrderPayload)
    API->>Rabbit: main_publisher.publish(payload, queue=order.proccess)
    API-->>UI: 202 Accepted ("order queued for processing")

    Rabbit->>Worker: _subscriber(payload)
    Worker->>Worker: init_orders (парсинг URL & параметров)
    Worker->>DB: add_to_playlist_batch (сохранение треков)
    
    Worker->>Fanout: main_publisher.publish(InternalPlaylistEvent: TRACK_ADDED)
    
    Fanout->>SIO: callback_router (callback_handler.py)
    SIO->>Viewers: Emit add_track:{playlist_id} (OrderDomain)
    Note over Viewers: Отображение нового трека в очереди плейлиста.
```

---

### 2.3. Диаграмма последовательности: Автопереход и сфера событий смены трека (Track Transition)

```mermaid
sequenceDiagram
    autonumber
    actor Player as Владелец Плеера (UI)
    participant UI as React UI (usePlaybackFeed)
    participant API as FastAPI (/playlist/{id}/playnow or /next)
    participant DB as PostgreSQL
    participant Fanout as RabbitMQ (playlist_fanout_exchange)
    participant Callback as callback_handler.py
    participant History as history_handler.py
    participant SIO as Socket.IO Server

    Player->>UI: Завершение воспроизведения (onEnded)
    UI->>API: POST /playlist/{id}/playnow (track_id)
    API->>DB: UPDATE current_playing_track
    
    API->>Fanout: Publish InternalPlaylistEvent (TRACK_PLAY / TRACK_LISTENED)
    
    par Раздельная обработка доменных подписчиков
        Fanout->>Callback: TRACK_LISTENED
        Callback->>SIO: delete_track / playnow
        SIO->>Player: Emit playnow:{playlist_id}
    and Запись в историю
        Fanout->>History: TRACK_PLAY
        History->>DB: upsert_entry (playback_history)
    end
```

---

### 2.4. Состояния заказа (Order Lifecycle State Machine)

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

## 3. Детальная спецификация моделей заказов

### 3.1. Структура `OrderDomain` / `track_data`
- `id`: UUID.
- `playlist_id`: UUID.
- `yt_video_id`: String (Идентификатор видео/аудио источника).
- `title`: String.
- `author`: String.
- `duration`: Float (Секунды).
- `source`: Enum (`youtube`, `vk`, `web`, etc.).
- `from_owner`: Boolean (Флаг заказа самим владельцем).
- `requester_nickname`: String | None.
- `priority`: Integer (Рассчитывается на основе стоимости заказа).
- `created_at`: Timestamp.
