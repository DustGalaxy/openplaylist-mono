# DonatePay Bot Microservice (`bot_donatepay`)

Autonomous Node.js 22 / TypeScript microservice integrating **DonatePay** donation streams with the OpenPlaylist platform.

---

## 🚀 Features

- **Centrifuge WebSocket Client:** Listens to real-time donation stream channels (`$donations:{id}`).
- **AMQP RPC & Command Handlers:** Communicates with the core backend using RabbitMQ direct queues and RPC patterns.
- **Media Link Parsing:** Extracts and canonicalizes YouTube URLs from donation payloads.
- **Multi-Tenant Stream Manager:** Dynamically initializes and tears down Centrifuge client connections per streamer.

For detailed architecture specifications, see [`docs/bots/bot_donatepay/messaging_guide.md`](../docs/bots/bot_donatepay/messaging_guide.md) and [`docs/bots/integrations.md`](../docs/bots/integrations.md).
