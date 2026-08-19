# 🔍 Комплексный аудит архитектуры: Связи, Потоки событий и Точки внимания

Документ содержит подробный анализ взаимодействия сервисов **OpenPlaylist Mono** (`new_ui`, `back-end`, `bot_ttv`, `RabbitMQ`, `Redis`, `PostgreSQL`, `Twitch API`), включая схемы потоков данных, очереди сообщений и точки внимания.

---

## 1. Карта потоков данных и событий

### 📌 Диаграмма 1: Авторизация и подключение каналов

```mermaid
sequenceDiagram
    autonumber
    actor Streamer as Стример (DustGalaxy)
    actor Admin as Администратор
    participant UI as new_ui / Admin View
    participant BE as back-end (FastAPI)
    participant DB as PostgreSQL
    participant RMQ as RabbitMQ (main_exchange)
    participant Bot as bot_ttv (TwitchIO 3)
    participant Twitch as Twitch Helix / EventSub

    Note over Admin,Bot: 1. Авторизация сервисного бота (@nullablelive)
    Admin->>UI: /admin/twitch_auth (Пресет "Bot Account")
    UI->>Twitch: OAuth (user:bot, user:write:chat, user:read:chat)
    Twitch-->>BE: Callback -> Сохранение токена
    BE->>DB: TwitchAdminToken (is_active=True)
    BE->>RMQ: Publish "bot.twitch.connect.request" (Tokens DTO)
    RMQ->>Bot: bot.add_token() [Зарегистрирован как bot_id: 1014404886]

    Note over Streamer,Bot: 2. Подключение стримера на сайте
    Streamer->>UI: Вход через Twitch (Безопасные скоупы: channel:bot, redemptions)
    UI->>BE: /auth/twitch/callback
    BE->>DB: LinkedAccount + TokenVault
    BE->>RMQ: Publish "bot.twitch.connect.request" (Tokens DTO)
    RMQ->>Bot: bot.add_token() + bot.multi_subscribe()
    Bot->>Twitch: Subscriptions: ChatMessage + ChannelPointsRedeemAdd
    Bot->>Twitch: get_or_create_channel_reward() (Автосоздание награды за баллы)
```

---

### 📌 Диаграмма 2: Заказ трека за баллы канала (Channel Points)

```mermaid
sequenceDiagram
    autonumber
    actor Viewer as Зритель в чате
    participant Twitch as Twitch EventSub / Helix
    participant Bot as bot_ttv
    participant Redis as Redis Cache
    participant RMQ as RabbitMQ
    participant BE as back-end (Worker)
    participant DB as PostgreSQL
    participant SIO as Socket.IO (Widget / UI)

    Viewer->>Twitch: Выкуп награды "Заказ музыки" (YouTube URL)
    Twitch->>Bot: WebSocket -> event_custom_redemption_add
    Bot->>Redis: Проверка статуса (!mr points on/off)
    
    alt Невалидный URL или отключено
        Bot->>Twitch: payload.refund() (Мгновенный возврат баллов)
        Bot->>Twitch: Сообщение в чат об ошибке
    else Валидный заказ
        Bot->>RMQ: bot_twitch_order_new (TTVNewOrder + reward_id + redemption_id)
        RMQ->>BE: "order.proccess" (NewOrderPayload)
        BE->>BE: order_service.init_orders() (Получение инфо о YouTube видео)
        BE->>BE: validate_track() (Черный список, лимиты длительности)
        BE->>DB: Сохранение трека в плейлист
        BE->>SIO: TRACK_ADDED -> Обновление виджета на стриме
        
        Note over BE,Bot: ⚠️ КРИТИЧЕСКИЙ ЭТАП ОБРАТНОЙ СВЯЗИ
        BE-->>RMQ: Publish "bot.order.completed" / "bot.order.cancelled" (OrderUpdate)
        RMQ-->>Bot: order_status() handler
        Bot-->>Twitch: patch_custom_reward_redemption (FULFILLED / CANCELED)
        Bot-->>Twitch: Сообщение в чат: "@viewer Трек успешно добавлен!"
    end
```

---

### 📌 Диаграмма 3: Общая архитектура компонентов и шина RabbitMQ

```mermaid
graph TD
    subgraph Frontend & Clients
        UI[new_ui React / Vite]
        AdminUI[SQLAdmin /admin]
        Widget[OBS Overlay / Widget]
        TwitchChat[Twitch Chat & Channel Points]
    end

    subgraph Messaging & Cache
        RMQ_MAIN[RabbitMQ: main_exchange]
        RMQ_FANOUT[RabbitMQ: playlist_fanout_exchange]
        RMQ_USER[RabbitMQ: user_fanout_exchange]
        REDIS[(Redis Cache / State)]
    end

    subgraph Backend Core
        API[FastAPI Web Server]
        Worker[Order Process Worker]
        CallbackWorker[Callback & SIO Worker]
        DB[(PostgreSQL)]
    end

    subgraph Microservices
        BotTTV[bot_ttv - TwitchIO 3]
        BotDA[bot_da - DonationAlerts]
        BotDX[bot_donatex - DonateX]
    end

    UI -->|HTTP / REST| API
    AdminUI -->|HTTP / OAuth| API
    Widget <-->|Socket.IO| API
    TwitchChat <-->|WebSocket EventSub / Helix| BotTTV

    API -->|Save Tokens / Users| DB
    Worker -->|Save Orders / Tracks| DB

    BotTTV -->|bot_twitch_order_new| RMQ_MAIN
    RMQ_MAIN -->|order.proccess| Worker
    Worker -->|TRACK_ADDED / REJECTED| RMQ_FANOUT
    RMQ_FANOUT --> CallbackWorker
    CallbackWorker -->|Socket.IO emit| Widget

    Worker -.->|bot.order.completed / cancelled| RMQ_MAIN
    RMQ_MAIN -.->|OrderUpdate| BotTTV

    BotTTV <-->|Reward IDs / On-Off Flags| REDIS
```

---

## 2. Матрица очередей и событий RabbitMQ

| Очередь / Топик | Exchange | DTO | Источник | Получатель | Назначение |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `bot.twitch.order.new` | `main_exchange` (DIRECT) | `TTVNewOrder` | `bot_ttv` | `back-end` | Передача нового заказа из Twitch в процессинг. |
| `order.proccess` | `main_exchange` (DIRECT) | `NewOrderPayload` | `back-end` | `back-end` (Worker) | Инициализация и валидация трека. |
| `internal.playlist.callback` | `playlist_fanout` (FANOUT) | `InternalPlaylistEvent` | `Worker` | `CallbackWorker` | Отправка событий через Socket.IO в UI/Виджет. |
| `bot.twitch.connect.request` | `main_exchange` (DIRECT) | `Tokens` | `back-end` | `bot_ttv` | Подключение нового стримера/бота на лету. |
| `bot.twitch.disconnect` | `main_exchange` (DIRECT) | `str` (user_id) | `back-end` | `bot_ttv` | Отключение канала и удаление подписок. |
| `auth.user.twitch.tokens.refreshed` | `main_exchange` (DIRECT) | `TwitchTokenRefreshed` | `bot_ttv` | `back-end` | Обновление протухших токенов в БД. |
| `bot.order.completed` ⚠️ | `main_exchange` (DIRECT) | `OrderUpdate` | `back-end` (Worker) | `bot_ttv` | Подтверждение заказа, закрытие награды (`FULFILLED`). |
| `bot.order.cancelled` ⚠️ | `main_exchange` (DIRECT) | `OrderUpdate` | `back-end` (Worker) | `bot_ttv` | Отклонение заказа, возврат баллов (`CANCELED`). |

---

## 3. Анализ текущего состояния системы

### ✅ Что работает идеально:
1. **Безопасность скоупов**: Обычные стримеры выдают только `channel:bot` и права на баллы. Права писать от имени стримера убраны.
2. **Админка**: В `/admin/twitch_auth` есть пресет для аккаунта бота (`user:bot`, `user:write:chat`, etc.) и автоотправка токена в RabbitMQ.
3. **Автосоздание наград**: Бот автоматически создает кастомную награду *"Заказ музыки (OpenPlaylist)"* и сохраняет ее ID в Redis.
4. **Управление стримером**: Команды `!mr points on/off/cost/title/prompt/link` работают напрямую из чата.
5. **Слушатель EventSub**: Метод `event_custom_redemption_add` правильно обрабатывает `ChannelPointsRedemptionAdd` и мгновенно возвращает баллы при ошибках в URL.

---

## 4. Обнаруженные критические точки внимания (Action Items)

### 🔴 Точка 1: Отсутствие публикации `OrderUpdate` в бэкенде
* **Где**: `back-end/src/adapters/_rabbit/worker/order_proccess_handler.py`.
* **Суть**: Воркер бэкенда принимает заказ, проверяет его, добавляет в базу данных и рассылает сокеты, **но не отправляет** сообщение в очереди `bot.order.completed` или `bot.order.cancelled`.
* **Последствия**:
  1. В чате Twitch бот не пишет уведомление зрителям о принятии/отклонении трека.
  2. Награда за баллы в Twitch Developer Console остается со статусом *"Unfulfilled"* (в ожидании) вместо *"FULFILLED"* (выполнено) или *"CANCELED"* (возвращено).

### 🟡 Точка 2: Очистка текстового ввода YouTube URL
* **Где**: `bot_ttv/src/components/music_request.py`.
* **Суть**: При выкупе за баллы зритель может случайно написать `глянь трек https://youtu.be/xyz`.
* **Решение**: Регулярное выражение `extract_youtube_video_id` надежно извлекает ID из любого текста, но URL для бэкенда лучше нормализовать как `https://www.youtube.com/watch?v={video_id}`.

### 🟡 Точка 3: Синхронизация статусов стримера при перезапуске Redis
* **Где**: Redis ключ `ttv:channel:{id}:reward_id`.
* **Суть**: Если Redis очищается, бот при следующем старте заново опрашивает Twitch Helix API через `get_or_create_channel_reward`, находит созданную награду по названию и восстанавливает кеш без создания дубликатов.
