import type { Socket } from 'socket.io-client'
import type {
  AllowSources,
  Platform,
  PlaylistPatch,
  PlaylistSettings,
} from '@/types/playlist'

// ─── wire format (from API) ────────────────────────────────────────
export type InputPlaylist = {
  id: string
  name: string
  owner_id: string
  description?: string
  is_public: boolean
  is_favorite: boolean
  is_allow_external_requests: boolean
  tags: Array<string>
  allow_sources: Array<AllowSources>
  show_in_widget: boolean
  track_data: Array<Track>
  now_playing: string | undefined
  created_at: string
  updated_at: string
  settings: PlaylistSettings
}
export type DeleteStatus = 'removed' | 'listened' | 'skipped' | 'reported'
// ─── cache data format (now_playing resolved to Track) ────────────
export type Playlist = Omit<InputPlaylist, 'now_playing'> & {
  now_playing: Track | undefined
}

// ─── roles / permissions ───────────────────────────────────────────
export type PlaylistRole = 'owner' | 'operator' | 'viewer'
export type TrackAction =
  | 'add'
  | 'remove'
  | 'reorder'
  | 'setSort'
  | 'setNowPlaying'
  | 'seek'
  | 'broadcast'

// ─── sort / ordering ────────────────────────────────────────────────
export type OrderMode = 'auto' | 'random' | 'free' | 'host'

export type SortSettings = {
  order_mode: OrderMode
  date: 'desc' | 'asc' | 'none'
  priority: 'desc' | 'asc' | 'none'
  manual_order_ids: Array<string>
}

export const DEFAULT_SORT: SortSettings = {
  order_mode: 'host',
  date: 'desc',
  priority: 'none',
  manual_order_ids: [],
}

export interface SplitQueue {
  vip: Array<Track>
  regular: Array<Track>
  background: Array<Track>
}

// ─── playback-local state (per playlist, lives in cache) ──────────
export interface PausedBackground {
  track_id: string
  position_seconds: number
}

export interface PlaybackPosition {
  track_id: string
  position: number
  updated_at: number
}

// ─── sync broadcast payloads (owner → viewer, via socket) ─────────
export interface SyncSeekPayload {
  track_id: string
  position: number
  updated_at: number
}

export interface SyncPausePayload {
  is_paused: boolean
  track_id: string
  position: number
  updated_at: number
}

// ─── next-track resolution result (playback ops) ──────────────────
export interface NextTrackDecision {
  nextTrackId: string | undefined
  removeCurrentId: string | undefined
  resumePositionSeconds: number | undefined
  consumedPausedBackground: boolean
}

export interface PendingResume {
  track_id: string
  position_seconds: number
}

// ─── cache entry ────────────────────────────────────────────────────
export interface PlaylistCacheEntry {
  data: Playlist
  refCount: number
  local: {
    history: Array<string>
    sortOverride: SortSettings
    paused_background: PausedBackground | null
    playbackPosition: PlaybackPosition | null
    syncSeek: SyncSeekPayload | null
    syncPause: SyncPausePayload | null
    pendingResume: PendingResume | null
    acceptSync: boolean
    broadcasting: boolean // owner-side: is this playlist currently being sync-broadcast
  }
}

// ─── slots ──────────────────────────────────────────────────────────
export type SlotId = 'player' | 'page'

export interface SlotState {
  playlistId: string | null
  currentTrackId: string | null // only meaningful for 'player'
}

// ─── base slice ──────────────────────────────────────────────────────
export interface BaseState {
  userId: string | null
  socket: Socket | null
  playerSessionRestored: boolean
  setUserId: (userId: string | null) => void
  setSocket: (socket: Socket | null) => void
  setPlayerSessionRestored: () => void
}

// ─── cache slice ─────────────────────────────────────────────────────
export interface CacheSlice {
  cache: Record<string, PlaylistCacheEntry>
  attachPlaylist: (playlistId: string) => Promise<void>
  detachPlaylist: (playlistId: string) => void
  updateLocal: (
    playlistId: string,
    patch: Partial<PlaylistCacheEntry['local']>,
  ) => void
  updatePlaylistData: (
    playlistId: string,
    fn: (p: Playlist) => Playlist,
  ) => void
  registerSocketLifecycle: () => void
}

// ─── slot slice ──────────────────────────────────────────────────────
export interface SlotSlice {
  slots: Record<SlotId, SlotState>
  setSlotPlaylist: (slot: SlotId, playlistId: string | null) => void
  setPlayerTrack: (trackId: string | null) => void
  clearSlot: (slot: SlotId) => void
}

// ─── role slice ──────────────────────────────────────────────────────
export interface RoleSlice {
  getRole: (
    playlist: Playlist | undefined,
    userId: string | null,
  ) => PlaylistRole
  getSlotRole: (slot: SlotId) => PlaylistRole
  canAct: (
    action: TrackAction,
    role: PlaylistRole,
    playlist: Playlist,
  ) => boolean
  canActInSlot: (slot: SlotId, action: TrackAction) => boolean
}

// ─── track ops slice ────────────────────────────────────────────────

export interface TrackInput {
  yt_video_url: string
}
export interface WireTrack {
  id: string
  request_id: string
  owner_id: string
  from_owner: boolean
  requester_nickname: string
  priority: string // label, e.g. "donation:..." or chat rule key — resolved via computePriority
  yt_video_id: string
  title: string
  duration: number // seconds
  views: number
  likes: number
  source: Platform
  extra_data: Record<string, any>
  created_at: string
  updated_at: string
}

export interface FeedTrack {
  track: Track
  group: 'vip' | 'regular' | 'background'
}

export interface Track {
  id: string // orderId (уникальный для записи в плейлисте)
  playlist_id: string
  yt_video_id: string
  priority: number
  title: string
  duration: string
  requester_nickname: string
  created_at: string // ISO
  source: Platform // twitch | youtube | web
  extra_data: Record<string, any>
  loading?: boolean // для оптимистичного состояния
  from_owner?: boolean // трек добавлен самим стримером (с бэкенда)
}

export interface TrackOpsSlice {
  addTrack: (slot: SlotId, track: TrackInput) => Promise<void>
  removeTrack: (
    slot: SlotId,
    trackId: string,
    reason: DeleteStatus,
  ) => Promise<void>
}

// ─── playback ops slice ─────────────────────────────────────────────
export interface PlaybackOpsSlice {
  playTrack: (trackId: string, positionSeconds?: number) => void
  playNext: (reason?: DeleteStatus) => boolean
  playPrev: () => void
  stopPlayback: () => void
  startPlaylist: (playlistId: string) => Promise<void>
  startTrack: (playlistId: string, trackId: string) => Promise<void>
}

// ─── sync slice ──────────────────────────────────────────────────────
export interface SyncSlice {
  toggleBroadcast: (playlistId: string, enabled: boolean) => void
  setAcceptSync: (playlistId: string, accept: boolean) => void
}

// ─── playlist settings slice ─────────────────────────────────────────
export interface PlaylistSettingsSlice {
  patchPlaylistMeta: (playlistId: string, patch: PlaylistPatch) => Promise<void>
  toggleExternalRequests: (
    playlistId: string,
    isActive: boolean,
  ) => Promise<void>
  reorderTrack: (
    slot: SlotId,
    group: 'vip' | 'regular' | 'background',
    ids: Array<string>,
  ) => Promise<void>
  reorderStepTrack: (
    slot: SlotId,
    group: 'vip' | 'regular' | 'background',
    trackId: string,
    dir: 'up' | 'down',
  ) => Promise<void>
  setSort: (
    slot: SlotId,
    group: 'vip' | 'regular',
    patch: Partial<SortSettings>,
  ) => Promise<void>
  reorderLocalTrack: (slot: SlotId, ids: Array<string>) => void
  reorderLocalStepTrack: (
    slot: SlotId,
    trackId: string,
    dir: 'up' | 'down',
  ) => void
}

// ─── root store ──────────────────────────────────────────────────────
export type StoreState = BaseState &
  CacheSlice &
  SlotSlice &
  RoleSlice &
  TrackOpsSlice &
  PlaybackOpsSlice &
  PlaylistSettingsSlice &
  SyncSlice
