# Playlist Modes & Queue Rules Guide

## 1. General Rules for All Playlists

- **Shuffle Flag:** Selects a random track from the eligible pool, bypassing sort ordering.
- **Queue Progression Modes:**
  - **Automatic:** Sorted dynamically by configured sort rules.
  - **Random:** Next track chosen randomly within category (Standard / VIP / Background).
  - **Manual / Free Reordering:** Drag-and-drop manual ordering where new tracks append to the end.
- **VIP / Premium Threshold:** A track is classified as VIP when its calculated priority meets or exceeds `priority_break_point`.

### Mode Data Structure
```json
{
  "modeName": { 
    "priority_break_point": 100,
    "sort_settings_vip": {
      "date": "desc",
      "priority": "desc"
    },
    "sort_settings_background": {
      "date": "desc",
      "priority": "desc"
    },
    "manual_order_ids": []
  }
}
```

In **Stream** mode, `background_track_ids: []` specifies the list of persistent background loop tracks.

---

## 2. Static Playlist (`static`)

### Standard Ordered Tracks
- **Post-playback:** Tracks remain in the playlist after playing.
- **Sorting:** Priority, date, or free manual reordering.

### VIP Tracks
- Separate sort configuration and distinct visual highlighting on track cards.
- Preempts currently playing non-VIP tracks if configured.

---

## 3. Flow Playlist (`flow`)

### Standard Ordered Tracks
- **Post-playback:** Tracks are automatically removed from the queue after playing.
- **Sorting:** Priority, date, or manual reordering.

### VIP Tracks
- Separate VIP sort rules and card visual styling.

---

## 4. Stream Playlist (`stream`)

### Background Tracks
- Reside in an isolated background loop sub-queue.
- Background tracks are not deleted upon completion; they cycle continuously in a loop when no viewer orders exist.
- Any track can be flagged as background music.
- Distinct visual grouping separating background tracks from active viewer requests.

### Viewer Order Tracks
- **Post-playback:** Automatically removed upon completion.
- **Behavior:** Inbound orders immediately interrupt the active background track and begin playing according to queue rules.

### VIP Tracks
- VIP orders interrupt active standard orders and advance to the top of the queue.
