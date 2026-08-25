# DonateX Bot Microservice (`bot_donatex`)

Autonomous Python microservice integrating **DonateX** donation streams with the OpenPlaylist platform.

---

## 🚀 Features

- **SignalR Core WebSocket Integration:** Connects to the `/public-donations-hub` to stream live incoming donations.
- **Media Link Parsing:** Extracts video URLs from donation payloads using regex parsers.
- **RabbitMQ Pipeline:** Normalized orders are published to `bot.donatex.order.new`.
- **401 Interception & Auto-Refresh:** Catches authorization expiration, executes token refreshes, and signals status back to the backend.

For detailed architecture specifications, see [`docs/bots/integrations.md`](../docs/bots/integrations.md).
