# DonationAlerts Bot Microservice (`bot_da`)

Autonomous Python microservice integrating **DonationAlerts** with the OpenPlaylist platform.

---

## 🚀 Features

- **Centrifugo WebSocket Client:** Subscribes to real-time donation stream channels (`$alerts:donation_{user_id}`).
- **Media Link Parsing:** Extracts and canonicalizes YouTube media URLs from donation messages.
- **AMQP Message Bridge:** Dispatches normalized `OrderNew` events into the backend processing queue (`bot.da.order.new`).
- **OAuth2 Token Renewal:** Seamless background token refreshing and synchronization via RabbitMQ.
- **Multi-Tenant Connection Manager:** Dynamically initializes listener sockets on streamer account link/unlink.

For detailed architecture specifications, see [DOCUMENTATION.md](./DOCUMENTATION.md) and [`docs/bots/integrations.md`](../docs/bots/integrations.md).
