# Twitch Bot Microservice (`bot_ttv`)

Autonomous Python microservice integrating **Twitch IRC** and **EventSub** with the OpenPlaylist platform.

---

## 🚀 Features

- **Multi-Tenant TwitchIO AutoBot:** Manages active chat connections across multiple streamer channels concurrently.
- **Chat & Channel Points Requests:** Processes `!mr <url>` chat commands and Twitch Channel Points reward redemptions.
- **Subscriber Role Priority Scoring:** Computes user badge ranks (Broadcaster, Mod, VIP, Sub, Founder) to calculate queue priority.
- **Chat Notifications:** Sends asynchronous status updates (`FULFILLED`, `CANCELED`, error reasons) back to the Twitch chat.

For detailed architecture specifications, see [`docs/bots/bot_ttv.md`](../docs/bots/bot_ttv.md).
