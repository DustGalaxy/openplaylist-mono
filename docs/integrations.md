# Подсистема интеграций и ботов (External Integrations & Bots System)

Документация описывает микросервисную архитектуру сторонних ботов (Twitch, DonationAlerts, DonatePay, DonateX), механизмы автообновления токенов и трансфер заказов из донат-сервисов в **OpenPlaylist**.

---

## 1. Архитектурный обзор (Architecture Overview)

Подсистема интеграций представляет собой совокупность микросервисов-ботов, взаимодействующих с бэкэндом через асинхронный брокер **RabbitMQ**.

1. **Экосистема Ботов (Bot Microservices)**:
   - **`bot_da`**: Бот платформы **DonationAlerts** (слушает донат-алерты, алерты сообщений).
   - **`bot_twitch` (`bot_ttv`)**: Бот платформы **Twitch** (чат-команды, баллы канала / Channel Points, модерация).
   - **`bot_donatepay`**: Бот платформы **DonatePay**.
   - **`bot_donatex`**: Бот платформы **DonateX**.

2. **Очереди взаимодействия в RabbitMQ (`queues.py`)**:
   - `bot.{platform}.connect.request`: Запрос на подключение бота к платформе пользователя.
   - `bot.{platform}.connect.response`: Ответ бота о статусе подключения.
   - `bot.{platform}.order.new`: Новый заказ трека из сообщения доната/чата.
   - `bot.{platform}.ack.connection`: Подтверждение активной связи с ботом.
   - `bot.{platform}.disconnect`: Запрос на отключение бота.

3. **Автообновление токенов интеграций**:
   - Очереди `auth.user.{platform}.tokens.refreshed` транслируют новые пары Access/Refresh токенов после автоматического обновления истекших сессий.

---

## 2. Графики и диаграммы взаимодействия (System Diagrams)

### 2.1. Компонентная архитектура интеграций (Data Flow Diagram)

```mermaid
flowchart TB
    subgraph Platforms ["External Streaming & Donation Platforms"]
        TTV["Twitch API / WebSockets"]
        DA["DonationAlerts WebSockets"]
        DonatePay["DonatePay API"]
        DonateX["DonateX API"]
    end

    subgraph BotServices ["Bot Microservices Layer"]
        BotTTV["bot_ttv Service"]
        BotDA["bot_da Service"]
        BotDP["bot_donatepay Service"]
        BotDX["bot_donatex Service"]
    end

    subgraph RabbitMQBus ["RabbitMQ Message Broker"]
        ConnectQueue["bot.*.connect.request"]
        OrderQueue["order.proccess queue"]
        AckQueue["bot.*.ack.connection"]
        TokenQueue["auth.user.*.tokens.refreshed"]
    end

    subgraph BackendCore ["OpenPlaylist Backend & Workers"]
        UserAPI["FastAPI User Routes<br/><i>/user/bots/{platform}/*</i>"]
        OrderWorker["Order Worker<br/><i>order_proccess_handler.py</i>"]
        TokenWorker["Token Refresh Worker<br/><i>src/tasks/tokens.py</i>"]
        SIO["Socket.IO Server<br/><i>ack_bot_connected</i>"]
    end

    %% Flow connections
    UserAPI -->|1. Connect Request| ConnectQueue
    ConnectQueue -->|2. Start Bot Listener| BotServices
    
    Platforms <-->|3. WebSockets / Centrifugo| BotServices
    
    BotServices -->|4. Parse Donation & Track URL| OrderQueue
    OrderQueue -->|5. Add Track to Playlist| OrderWorker

    BotServices -->|6. Confirm Connection| AckQueue
    AckQueue -->|7. Notify Frontend| SIO

    TokenWorker -->|8. Push Refreshed Tokens| TokenQueue
    TokenQueue -->|9. Update Bot Credentials| BotServices
```

---

### 2.2. Диаграмма последовательности: Подключение донат-бота (Bot Connection Sequence)

```mermaid
sequenceDiagram
    autonumber
    actor User as Стример (Владелец)
    participant UI as React UI (Integration Page)
    participant API as FastAPI (/user/bots/da/connect)
    participant Rabbit as RabbitMQ (bot.da.connect.request)
    participant Bot as bot_da Microservice
    participant DA as DonationAlerts Centrifugo WebSocket
    participant SIO as Socket.IO Server (Root Namespace)

    User->>UI: Клик "Подключить DonationAlerts Бота"
    UI->>API: POST /user/bots/da/connect (platform_user_id)
    API->>Rabbit: Publish bot.da.connect.request (user_id, platform_user_id, token_vault)
    API-->>UI: 200 OK ("Bot connect request dispatched")

    Rabbit->>Bot: Consume connect request
    Bot->>DA: Connect WebSocket (Token Authentication)
    DA-->>Bot: Connection Established

    Bot->>Rabbit: Publish bot.da.ack.connection (user_id, platform_user_id)
    Rabbit->>SIO: FastStream worker / notification_handler
    SIO->>UI: Emit ack_bot_connected:da (platform_user_id)
    Note over UI: Показ зеленым индикатором: "Бот подключен и слушает донаты"
```

---

### 2.3. Диаграмма последовательности: Заказ трека через донат (Donation Track Order Flow)

```mermaid
sequenceDiagram
    autonumber
    actor Donator as Зритель / Донатер
    participant DA as DonationAlerts Platform
    participant Bot as bot_da Service
    participant Rabbit as RabbitMQ (order.proccess)
    participant Backend as FastStream Order Pipeline
    participant DB as PostgreSQL
    actor Streamer as Стример (React UI)

    Donator->>DA: Отправка доната с сообщением: "https://youtu.be/xyz Сделай громче!"
    DA->>Bot: WebSocket Event: Donation Received (amount, message, username)
    
    Bot->>Bot: Извлечение ссылки на YouTube (regex URL parser)
    Bot->>Rabbit: Publish NewOrderPayload (yt_url, amount, requester_nickname, playlist_id)
    
    Rabbit->>Backend: FastStream order_proccess_handler
    Backend->>Backend: Расчет приоритета (cost_mode: add/max на основе amount)
    Backend->>DB: Сохранение трека в очередь плейлиста
    Backend-->>Streamer: WebSocket Event: add_track (Отображение донат-трека)
```

---

### 2.4. Состояния соединения бота (Bot Connection State Machine)

```mermaid
stateDiagram-v2
    [*] --> Disconnected: No active bot connection
    
    Disconnected --> ConnectionDispatched: User clicks Connect in UI
    ConnectionDispatched --> ConnectingToPlatform: Bot microservice receives request
    
    state "Connected Active State" as Active {
        ConnectingToPlatform --> ListeningWebSockets: Centrifugo or WebSocket Connected
        ListeningWebSockets --> ProcessingDonations: Receives donation event with track URL
        ProcessingDonations --> ListeningWebSockets: Dispatches order and waits for next
        ListeningWebSockets --> TokenRefreshing: Token expires and triggers refresh
        TokenRefreshing --> ListeningWebSockets: Re-authenticated with new access token
    }

    Active --> Disconnecting: User clicks Disconnect or Token Revoked
    Disconnecting --> Disconnected
```

---

## 3. Детальная спецификация очередей ботов

### 3.1. Структура сообщений `bot.{platform}.connect.request`
- `user_id`: UUID пользователя в OpenPlaylist.
- `platform`: Enum (`da`, `twitch`, `donatepay`, `donatex`).
- `platform_user_id`: Идентификатор аккаунта стримера на платформе.
- `access_token`: Зашифрованный токен авторизации из `TokenVault`.
- `refresh_token`: Токен обновления.

### 3.2. Автоматическое обновление токенов
- Фоновая задача `src/tasks/tokens.py` регулярно проверяет время жизни токенов в `TokenVault`.
- Если `expires_at < now()`, выполняются OAuth-запросы на refresh и результат публикуется в очередей `auth.user.{platform}.tokens.refreshed`.
- Боты перехватывают новые токены на лету без разрыва соединения WebSocket.
