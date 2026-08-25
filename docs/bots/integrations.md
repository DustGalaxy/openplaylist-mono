# External Integrations & Bots Architecture

This document describes the microservices architecture of external streaming and donation bots (Twitch, DonationAlerts, DonatePay, DonateX), automated token refreshing, and donation media intake in **OpenPlaylist**.

---

## 1. Architecture Overview

The integration layer consists of decoupled autonomous bot microservices communicating with the core backend through **RabbitMQ (AMQP 0-9-1)** and **FastStream**.

1. **Bot Microservices Ecosystem:**
   - **`bot_da`:** **DonationAlerts** listener microservice (Centrifugo WebSocket for donations and chat alerts).
   - **`bot_ttv`:** **Twitch** interaction microservice (chat commands, Channel Points redemptions, subscriber priority queues).
   - **`bot_donatepay`:** **DonatePay** high-throughput TypeScript microservice.
   - **`bot_donatex`:** **DonateX** SignalR Core microservice.

2. **RabbitMQ Messaging Topology (`queues.py`):**
   - `bot.{platform}.connect.request`: Inbound command to start listening on behalf of a streamer.
   - `bot.{platform}.connect.response`: Outbound status confirmation from the bot.
   - `bot.{platform}.order.new`: Normalized track request extracted from donation/chat messages.
   - `bot.{platform}.ack.connection`: Active connection heartbeat and state acknowledgment.
   - `bot.{platform}.disconnect`: Inbound command to terminate bot session.

3. **Automated Token Vault & Refresh:**
   - The queue `auth.user.{platform}.tokens.refreshed` streams renewed Access/Refresh token pairs after proactive background refreshes before session expiry.

---

## 2. System Diagrams

### 2.1. Integration Component Topology (Data Flow Diagram)

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

### 2.2. Sequence Diagram: Bot Connection Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as Streamer (Owner)
    participant UI as React UI (Integration Page)
    participant API as FastAPI (/user/bots/da/connect)
    participant Rabbit as RabbitMQ (bot.da.connect.request)
    participant Bot as bot_da Microservice
    participant DA as DonationAlerts Centrifugo WebSocket
    participant SIO as Socket.IO Server (Root Namespace)

    User->>UI: Click "Connect DonationAlerts Bot"
    UI->>API: POST /user/bots/da/connect (platform_user_id)
    API->>Rabbit: Publish bot.da.connect.request (user_id, platform_user_id, token_vault)
    API-->>UI: 200 OK ("Bot connect request dispatched")

    Rabbit->>Bot: Consume connect request
    Bot->>DA: Connect WebSocket (Token Authentication)
    DA-->>Bot: Connection Established

    Bot->>Rabbit: Publish bot.da.ack.connection (user_id, platform_user_id)
    Rabbit->>SIO: FastStream worker / notification_handler
    SIO->>UI: Emit ack_bot_connected:da (platform_user_id)
    Note over UI: Status badge updates to green: "Bot active & listening for donations".
```

---

### 2.3. Sequence Diagram: Donation Track Order Processing

```mermaid
sequenceDiagram
    autonumber
    actor Donator as Viewer / Donator
    participant DA as DonationAlerts Platform
    participant Bot as bot_da Service
    participant Rabbit as RabbitMQ (order.proccess)
    participant Backend as FastStream Order Pipeline
    participant DB as PostgreSQL
    actor Streamer as Streamer (React UI)

    Donator->>DA: Send donation with message: "https://youtu.be/xyz Crank it up!"
    DA->>Bot: WebSocket Event: Donation Received (amount, message, username)
    
    Bot->>Bot: Extract YouTube URL (regex URL parser)
    Bot->>Rabbit: Publish NewOrderPayload (yt_url, amount, requester_nickname, playlist_id)
    
    Rabbit->>Backend: FastStream order_proccess_handler
    Backend->>Backend: Calculate priority (cost_mode: add/max based on amount)
    Backend->>DB: Save track into playlist queue
    Backend-->>Streamer: WebSocket Event: add_track (Live UI update)
```

---

### 2.4. Bot Connection State Machine

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

## 3. Queue Contracts & Data Models

### 3.1. Message Schema `bot.{platform}.connect.request`

- `user_id`: UUID of OpenPlaylist user.
- `platform`: Enum (`da`, `twitch`, `donatepay`, `donatex`).
- `platform_user_id`: External platform account ID.
- `access_token`: Encrypted token from `TokenVault`.
- `refresh_token`: Encrypted refresh token.

### 3.2. Automated Token Refresh Lifecycle

- Background task `src/tasks/tokens.py` scans expiring tokens in `TokenVault`.
- If `expires_at < now()`, OAuth refresh requests execute and the new credentials publish to `auth.user.{platform}.tokens.refreshed`.
- Connected bot microservices update authentication headers on the fly without disconnecting the WebSocket connection.
