# 🎵 OpenPlaylist Monorepo

<div align="center">

**High-performance, event-driven streaming interactive jukebox and donation queue platform.**

[![Python](https://img.shields.io/badge/Python-3.13-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.136+-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![RabbitMQ](https://img.shields.io/badge/RabbitMQ-4.1-FF6600?style=flat-square&logo=rabbitmq&logoColor=white)](https://www.rabbitmq.com)
[![Redis](https://img.shields.io/badge/Redis-7.1-DC382D?style=flat-square&logo=redis&logoColor=white)](https://redis.io)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker&logoColor=white)](https://www.docker.com)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg?style=flat-square)](./LICENSE)

</div>

---

> [!NOTE]
> **Portfolio & Skills Showcase:** This repository is published strictly for technical demonstration and portfolio evaluation. It showcases modern distributed system architecture, real-time WebSocket synchronization, microservices orchestration, and production-grade full-stack engineering.

---

## 🌟 Architectural Highlights & Core Capabilities

- **👑 Single Leader Playback Architecture:** The stream owner acts as the single source of truth for playback state. Real-time track progress, seeks, and pauses synchronize across all viewers and OBS overlays with minimal network overhead via **Redis DAL** (`PlaybackRepository`).
- **⚡ Event-Driven Microservices Bus:** The core FastAPI backend and autonomous bot microservices communicate asynchronously over **RabbitMQ (AMQP 0-9-1)** and **FastStream**, guaranteeing resilient delivery for orders, state changes, and management commands.
- **🤖 Multi-Platform Streaming & Donation Bots:**
  - **Twitch (`bot_ttv`):** Chat orders and Channel Points rewards processing, role-based priority queues, and Redis caching.
  - **DonationAlerts (`bot_da`):** Centrifugo WebSocket connection (`$alerts:donation_{id}`) with proactive OAuth2 token refreshing.
  - **DonatePay (`bot_donatepay`):** High-throughput **Node.js 22 / TypeScript** microservice with AMQP RPC and Centrifuge WS listeners.
  - **DonateX (`bot_donatex`):** SignalR Core WebSocket integration (`/public-donations-hub`) with automatic 401 interception and token refresh.
- **🔐 TokenVault & Automated Token Management:** Centralized encrypted storage for streamer OAuth2 tokens, performing preemptive background refreshes before TTL expiration.
- **📡 Multi-Namespace Realtime Engine:** Multi-room **Socket.IO** server (`/`, `/plst_upds`, `/widget`) delivering instant playlist queue updates, live audit logs, and OBS overlays.
- **🎨 Modern Web Client (`new_ui`):** Built with **React 19, TypeScript, Vite, TanStack Router & Query, Zustand, and TailwindCSS**, featuring multi-theme support (Dark/Light), internationalization (EN/RU/UA), and an audio player with loopback echo filtering (*Anti-Echo Filter*).

---

## 🏗️ System Architecture

```mermaid
flowchart TB
    subgraph Clients ["Client Layer (Frontend & Overlays)"]
        UI["React 19 SPA (/new_ui)<br/><i>TanStack Query + Zustand</i>"]
        OBS["OBS Stream Overlays<br/><i>/widget Socket.IO</i>"]
    end

    subgraph Gateway ["Reverse Proxy & Ingress"]
        Caddy["Caddy Server (TLS / HTTP2)<br/><i>:80 / :443</i>"]
    end

    subgraph Backend ["Core Backend Service (/back-end)"]
        API["FastAPI App (:8000)<br/><i>REST API + Socket.IO Server</i>"]
        Workers["Taskiq Workers & Scheduler<br/><i>Async Tasks Pipeline</i>"]
        FS_Handler["FastStream Consumers<br/><i>RabbitMQ Event Handlers</i>"]
    end

    subgraph Microservices ["Bot Microservices"]
        TTV["bot_ttv (Python 3.13)<br/><i>Twitch IRC & EventSub</i>"]
        DA["bot_da (Python 3.13)<br/><i>DonationAlerts Centrifugo</i>"]
        DPAY["bot_donatepay (Node.js 22)<br/><i>DonatePay AMQP Client</i>"]
        DONATEX["bot_donatex (Python 3.13)<br/><i>DonateX SignalR Hub</i>"]
    end

    subgraph Infrastructure ["Infrastructure & Storage"]
        RabbitMQ[("RabbitMQ 4.1<br/><i>main_exchange AMQP</i>")]
        Redis[("Redis 7<br/><i>State, DAL, PubSub, Taskiq</i>")]
        Postgres[("PostgreSQL 14<br/><i>Users, Playlists, Logs, Auth</i>")]
    end

    %% Client flows
    UI -->|HTTP / WebSocket| Caddy
    OBS -->|Socket.IO /widget| Caddy
    Caddy -->|/api* & SIO| API
    Caddy -->|Static assets| UI

    %% Backend flows
    API --> RabbitMQ
    API --> Redis
    API --> Postgres
    Workers --> Redis
    Workers --> Postgres
    FS_Handler --> API

    %% Bot flows
    RabbitMQ <--> TTV
    RabbitMQ <--> DA
    RabbitMQ <--> DPAY
    RabbitMQ <--> DONATEX
    TTV --> Redis
    DA --> Postgres
```

---

## 📦 Monorepo Subsystems Matrix

| Subsystem | Tech Stack | Responsibility & Architecture |
| :--- | :--- | :--- |
| [`back-end/`](./back-end) | Python 3.13, FastAPI, SQLAlchemy 2.0 Async, Taskiq, Socket.IO, Pydantic | Core API gateway, Argon2id/JWT auth, playlist lifecycle, Redis DAL, async workers |
| [`new_ui/`](./new_ui) | React 19, TypeScript, Vite, TanStack Router/Query, Zustand, TailwindCSS | Modern reactive client interface, operator dashboard, audio player, streamer analytics |
| [`bot_ttv/`](./bot_ttv) | Python 3.13, FastStream, TwitchIO, Redis | Twitch microservice: chat commands, channel points redemption, tier priority queue |
| [`bot_da/`](./bot_da) | Python 3.13, FastStream, Centrifugo WS, HTTPX | DonationAlerts donation listener microservice with token management |
| [`bot_donatepay/`](./bot_donatepay) | TypeScript, Node.js 22, amqplib, centrifuge-js | DonatePay donation intake microservice with AMQP RPC bridge |
| [`bot_donatex/`](./bot_donatex) | Python 3.13, FastStream, SignalR Core, Aiohttp | DonateX donation stream listener microservice via SignalR WebSocket hub |
| [`docs/`](./docs) | Markdown, Mermaid | Comprehensive system architecture and domain design specifications |

---

## 📚 Architecture Documentation Index

Deep-dive architecture specifications and diagrams are available in [`docs/`](./docs):
- [🗺️ System Architecture Index (docs/README.md)](./docs/README.md)
- [🎵 Single Leader Playback Pipeline (docs/core/playback.md)](./docs/core/playback.md)
- [📋 Playlists, Modes & Permissions (docs/core/playlists.md)](./docs/core/playlists.md)
- [💳 Order Processing & Donation Pipelines (docs/core/orders.md)](./docs/core/orders.md)
- [📡 Realtime Engine & Socket.IO (docs/core/realtime.md)](./docs/core/realtime.md)
- [🤖 Bots Architecture & TokenVault (docs/bots/integrations.md)](./docs/bots/integrations.md)
- [🎮 UserPlayer V2 & Moderation Controls (docs/player/player_and_moderation_v2_concept.md)](./docs/player/player_and_moderation_v2_concept.md)
- [🔍 System Architecture Flow Audit (docs/architecture/system_audit.md)](./docs/architecture/system_audit.md)

---

## 📄 License & Intellectual Property

This project is proprietary software. All rights reserved.  
Unauthorized copying, modification, distribution, or commercial deployment of this codebase or any part of it is strictly prohibited.  
For full terms, see the [LICENSE](./LICENSE) file.
