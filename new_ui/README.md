# OpenPlaylist Frontend (`new_ui`)

Modern Single Page Application for the OpenPlaylist streaming platform, built with **React 19**, **TypeScript 5.7+**, and **Vite 6**.

---

## 🚀 Tech Stack

- **Framework & Tooling:** React 19, TypeScript 5.7+, Vite 6
- **Routing:** `@tanstack/react-router` (File-based routing)
- **Data Fetching & Caching:** `@tanstack/react-query`, Axios
- **State Management:** Zustand
- **Styling & UI Components:** TailwindCSS, Radix UI, Lucide Icons, Sonner (Toasts)
- **Realtime Transport:** `socket.io-client`
- **Internationalization (i18n):** `i18next`, `react-i18next` (EN, RU, UA)
- **Testing:** Vitest, Testing Library

---

## 📁 Project Structure

```text
new_ui/src/
├── components/          # Shared primitive UI components (buttons, dialogs, icons)
├── features/            # Feature modules (Feature-Sliced architecture)
│   ├── auth/            # Authentication workflows and OAuth strategies
│   ├── feedback/        # User feedback and bug report dialogs
│   ├── history/         # Playback history, logs, and queue audit
│   ├── player/          # UserPlayer V2, timeline progress, audio controls
│   ├── playlist-settings/ # Playlist validation, limits, and pricing
│   ├── saves/           # User saved favorites list
│   ├── stats/           # Streamer analytics dashboards and KPIs
│   ├── united-playlist/ # Interactive order queue with Drag-and-Drop
│   ├── user-profile/    # Profile popover and role badges
│   └── user-settings/   # Account, bot connections, and widget overlays
├── hooks/               # Custom React hooks (useAuth, usePersonalRoom, useThrottle, etc.)
├── integrations/        # Provider layouts (TanStack Query, etc.)
├── lib/                 # Utilities, auth strategy registry, axios client, themes
├── routes/              # TanStack Router file-based route definitions
├── stores/              # Global Zustand state stores (playlistStore, playbackStore, authStore)
└── types/               # TypeScript models, DTOs, and interface definitions
```
