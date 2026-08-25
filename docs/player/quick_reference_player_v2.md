# Quick Reference: Player & Moderation Architecture V2

> **Purpose:** Quick reference and context cheat sheet for development sessions.

---

## 1. UserPlayer V2 Concept & State Model

1. **UserPlayer in Redis (`player:{owner_id}`):**
   * Streamer playback state is stored in a **Redis Hash** with TTL (7-day sliding window on activity).
   * Schema: `owner_id`, `active_playlist_id`, `current_track_id`, `current_track_data` (JSON), `position`, `is_paused`, `volume`, `broadcast_to_widget`, `last_client_id`, `updated_at`.
   * OBS stream overlay (`/widget`) and moderators in control mode subscribe and synchronize with this state.

2. **Dual Player Modes (`usePlaybackStore.playerMode`):**
   * **`'listen'` (Local Listening Mode):**
     * User/moderator plays music locally in their browser (audio unmuted).
     * Actions (clicking tracks, play/pause, seek, skip) remain **local** and **are NOT sent to the streamer**.
     * Stream events do not interrupt local playback.
   * **`'control'` (Stream Remote Control Mode):**
     * Moderator controls the live stream of the selected channel (`activeChannel.owner_id`).
     * Local browser audio in the moderator tab is muted (`volume = 0`) to prevent stream echo.
     * Actions are dispatched to the backend via `/player/{owner_id}/*` and Socket.IO.

3. **Viewer Synchronization (`acceptSync`):**
   * Standard viewers can toggle the sync button ("Radio" mode) to mirror stream playback in their browser (`acceptSync: true`).

---

## 2. Echo Filtering (`CLIENT_ID`) & Broadcast Rules

### Outbound Rule (`shouldBroadcast`):
```ts
// Commands are broadcast to stream ONLY if the user is the owner,
// or an authorized moderator in active 'control' mode
const shouldBroadcast =
  role === 'owner' ||
  ((role === 'operator' || canControlPlayback) && playerMode === 'control')
```

### Inbound Rule (Socket.IO):
* Always verified: `incoming.client_id !== CLIENT_ID` (ignore self-originated events).
* Local playback slot updates only if: `isOwner || playerMode === 'control' || acceptSync`.

---

## 3. ReactPlayer v3.4.0 Specifics (`@muxinc/youtube-video-element`)

1. **Mandatory `src` Property:**
   * In `react-player` 3.x with YouTube custom elements, pass `<ReactPlayer src={videoUrl} ... />` (instead of legacy `url`).
2. **HTML5 Event Handlers:**
   * Progress and duration are read through standard events: `onTimeUpdate`, `onDurationChange`, `onLoadedMetadata`, `onPlay`, `onPause`, `onEnded`.
3. **Buffering Pause Protection:**
   * `handlePause` validates player readiness so YouTube buffering cycles do not falsely unset `feed.playing`.

---

## 4. Development & Testing Guidelines

* **Python Backend (`back-end/`):**
  * Always use `uv`!
  * Run tests: `uv run pytest`
  * Run scripts: `uv run python <script.py>`
* **React Frontend (`new_ui/`):**
  * Run tests: `npx vitest run`
* **UI Components (`Btn`):**
  * The custom `Btn` component (`src/components/ui/my-btn.tsx`) has built-in 3D button styling and drop-shadows — do not add extra `hover:bg-*` or `hover:text-*`.
