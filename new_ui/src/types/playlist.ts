import type { ReactElement } from 'react'
import type { Socket } from 'socket.io-client'
import type { PublicUser } from './user'
import type { PublicModeratorItem } from './moderator'

// ─── Enums & Basic Platforms ─────────────────────────────────────────

export enum Platform {
  General = '__general__',
  Twitch = 'twitch',
  YouTube = 'youtube',
  Web = 'web',
  DonationAlerts = 'donationalerts',
  DonateX = 'donatex',
  DonatePay = 'donatepay',
}

export enum DonationPlatform {
  General = '__general__',
  DonationAlerts = 'donationalerts',
  DonateX = 'donatex',
  DonatePay = 'donatepay',
}

export enum ChatPlatform {
  Twitch = 'twitch',
  YouTube = 'youtube',
}

export enum RequestPlatform {
  Web = 'web',
  Twitch = 'twitch',
  YouTube = 'youtube',
  DonationAlerts = 'donationalerts',
  DonateX = 'donatex',
  DonatePay = 'donatepay',
}

export enum ExternalContentPlatform {
  Twitch = 'twitch',
  YouTube = 'youtube',
  DonationAlerts = 'donationalerts',
  DonateX = 'donatex',
  DonatePay = 'donatepay',
}

export enum PlaylistMode {
  Flow = 'flow',
  Static = 'static',
  Stream = 'stream',
}

// ─── Core Domain Entities ────────────────────────────────────────────

export type Role = {
  key: string
  name: string
  platform: ChatPlatform
  badge_type: 'svg' | 'img'
  badge_url: string | ReactElement | null
}

export type Order = {
  request_id: string
  owner_id: string
  owner_platform_id: string
  requester_id: string
  requester_nickname: string
  playlist_id: string
  yt_video_url: string
  priority: string
  source: 'web'
  start_from_target?: boolean
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
  note?: string | null
  is_note_public?: boolean
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
  note?: string | null
  is_note_public?: boolean
  created_at: string
  updated_at: string
}

export interface TrackInput {
  yt_video_url: string
  priority?: string
  start_from_target?: boolean
}

export interface FeedTrack {
  track: Track
  group: 'vip' | 'regular' | 'background'
}

// ─── Rules & Settings Models ─────────────────────────────────────────

export type ContentSettings = {
  id: string
  settings_id: string
  platform: Platform
  min_views: number
  min_likes: number
  max_duration: number
  track_cooldown: number
  user_cooldown: number
}

export interface ReadDonationRules {
  id: string
  settings_id: string
  platform: DonationPlatform
  name: string
  currency: string
  amount: number
  priority: number
  content_settings?: Record<string, any> | null
}

export interface ReadChatRules {
  id: string
  settings_id: string
  platform: ChatPlatform
  key: string
  priority: number
  content_settings?: Record<string, any> | null
  overrive_order?: number | null
}

export type ReadBlockList = {
  id: string
  settings_id: string
  platform: Platform | null
  trigger_type: string
  trigger_value: string
}

export interface AllowSources {
  platform: Platform
  platform_user_id: string
}

export type RuleType = 'content' | 'donation' | 'chat' | 'block'

export interface RulesPatch {
  type: RuleType
  added: Array<
    ContentSettings | ReadDonationRules | ReadChatRules | ReadBlockList
  >
  changed: Array<
    ContentSettings | ReadDonationRules | ReadChatRules | ReadBlockList
  >
  removed: Array<
    ContentSettings | ReadDonationRules | ReadChatRules | ReadBlockList
  >
}

// ─── Playlist Configuration & Sorting ───────────────────────────────

export type OrderMode = 'auto' | 'free' | 'host'

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

export type ModeSettings = {
  priority_break_point: number
  sort_settings_vip: SortSettings
  sort_settings_regular: SortSettings
}

export type ModeSettingsMap = {
  [PlaylistMode.Flow]: ModeSettings
  [PlaylistMode.Static]: ModeSettings
  [PlaylistMode.Stream]: ModeSettings
}

// ─── Playlist DTOs & Models ─────────────────────────────────────────

export type InputPlaylist = {
  id: string
  owner_id: string
  owner_nickname: string
  name: string
  description?: string
  tags: Array<string>
  is_public: boolean
  is_favorite: boolean
  favorites_count: number
  is_allow_external_requests: boolean
  allow_sources: Array<AllowSources>
  now_playing?: string
  track_data: Array<WireTrack>
  background_track_ids: Array<string>
  max_playlist_size: number
  mode: PlaylistMode
  repeat_mode: 'all' | 'once' | 'none'
  mode_settings: ModeSettingsMap
  sync_playback_position: boolean
  cost_mode: 'add' | 'max'
  track_black_list: Array<string>
  content_settings: Array<ContentSettings>
  block_list: Array<ReadBlockList>
  donation_rules: Array<ReadDonationRules>
  chat_rules: Array<ReadChatRules>
  moderators?: Array<PublicModeratorItem>
  created_at: string
  updated_at: string
}

export interface FavoriteStatusResponse {
  playlist_id: string
  is_favorite: boolean
  favorites_count: number
}

export interface ReadPlaylistPreview {
  id: string
  owner_nickname: string
  name: string
  description?: string | null
  favorites_count: number
  created_at?: string
  updated_at?: string
}

export type Playlist = Omit<InputPlaylist, 'now_playing'> & {
  now_playing: Track | undefined
  track_data: Array<Track>
}

export type PlaylistPatch = {
  name?: string
  description?: string
  tags?: Array<string>
  allow_sources?: Array<AllowSources>
  is_public?: boolean
  is_favorite?: boolean
  is_allow_external_requests?: boolean
  max_playlist_size?: number
  mode?: PlaylistMode
  repeat_mode?: 'all' | 'once' | 'none'
  mode_settings?: ModeSettingsMap
  sync_playback_position?: boolean
  cost_mode?: 'add' | 'max'
  track_black_list?: Array<string>
}

// ─── Playback & Sync State Types ─────────────────────────────────────

export type PausedBackgroundTrack = {
  track_id: string
  position: number
}

export interface PausedBackground {
  track_id: string
  position_seconds: number
}

export interface PlaybackPosition {
  track_id: string
  position: number
  client_id: string
  updated_at: string | number
}

export type PlayNow = {
  playlist_id: string
  track_id: string
}

export interface SyncSeekPayload {
  position: number
  track_id?: string
  client_id?: string
}

export interface SyncPausePayload {
  is_paused: boolean
  position: number
  track_id?: string
  client_id?: string
}

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

export interface SplitQueue {
  vip: Array<Track>
  regular: Array<Track>
  background: Array<Track>
}

export interface PendingInterrupt {
  fromTrackId: string
  toTrackId: string
  groupWasInterrupt: 'vip' | 'regular' | 'background'
}
// ─── Roles & Permissions ─────────────────────────────────────────────

export type PlaylistRole = 'owner' | 'operator' | 'viewer'

export type TrackAction =
  | 'add'
  | 'remove'
  | 'reorder'
  | 'setSort'
  | 'setNowPlaying'
  | 'seek'
  | 'broadcast'

export type DeleteStatus = 'removed' | 'listened' | 'skipped' | 'reported'
export type SortBy = 'priority' | 'date' | 'shuffle'
export type RepeatMode = 'all' | 'once' | 'none'

// ─── Cache & Store Architecture Types ───────────────────────────────

export interface PlaylistCacheEntry {
  data: Playlist
  refCount: number
  owner: PublicUser
  local: {
    history: Array<string>
    sortOverride: SortSettings
    repeatMode: RepeatMode
    shuffle: boolean

    paused_background: PausedBackground | null
    paused_regular: PausedBackground | null

    syncSeek: SyncSeekPayload | null
    syncPause: SyncPausePayload | null
    acceptSync: boolean

    pendingInterrupt: PendingInterrupt | null
    pendingResume: PendingResume | null
  }
}

export type SlotId = 'player' | 'page'

export interface SlotState {
  playlistId: string | null
  currentTrackId: string | null
}

// ─── Store Slices Interfaces ─────────────────────────────────────────

export interface BaseState {
  userId: string | null
  socket: Socket | null
  playerSessionRestored: boolean
  setUserId: (userId: string | null) => void
  setSocket: (socket: Socket | null) => void
  setPlayerSessionRestored: (value: boolean) => void
}

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

export interface SlotSlice {
  slots: Record<SlotId, SlotState>
  setSlotPlaylist: (slot: SlotId, playlistId: string | null) => void
  setPlayerTrack: (trackId: string | null) => void
  clearSlot: (slot: SlotId) => void
}

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

export interface TrackOpsSlice {
  addTrack: (slot: SlotId, track: TrackInput) => Promise<void>
  removeTrack: (
    slot: SlotId,
    trackId: string,
    reason: DeleteStatus,
  ) => Promise<void>
  removeTracks: (
    slot: SlotId,
    trackIds: Array<string>,
    reason: DeleteStatus,
  ) => Promise<void>
  updateTrackNote: (
    playlistId: string,
    trackId: string,
    note: string | null,
    isPublic?: boolean,
  ) => void
}

export interface PlaybackOpsSlice {
  playTrack: (trackId: string, positionSeconds?: number) => void
  playNext: (reason?: DeleteStatus) => boolean
  playPrev: () => void
  stopPlayback: () => void
  startPlaylist: (playlistId: string) => Promise<void>
  startTrack: (playlistId: string, trackId: string) => Promise<void>
}

export interface SyncSlice {
  toggleBroadcast: (playlistId: string, enabled: boolean) => void
  setAcceptSync: (playlistId: string, accept: boolean) => void
}

export interface PlaylistSettingsSlice {
  patchNow: (playlistId: string, patch: Partial<Playlist>) => Promise<void>
  patchDebounced: (playlistId: string, patch: Partial<Playlist>) => void
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

export interface PlaylistRulesSlice {
  addChatRole: (
    playlistId: string,
    data: { platform: ChatPlatform; key: string; priority: number },
  ) => Promise<ReadChatRules | null>
  updateChatRole: (playlistId: string, role: ReadChatRules) => void
  removeChatRole: (playlistId: string, roleId: string) => Promise<boolean>

  addDonationRule: (
    playlistId: string,
    data: {
      platform: DonationPlatform
      name: string
      amount: number
      priority: number
      currency: string
    },
  ) => Promise<ReadDonationRules | null>
  updateDonationRule: (playlistId: string, rule: ReadDonationRules) => void
  removeDonationRule: (playlistId: string, ruleId: string) => Promise<boolean>

  initContentSettings: (
    playlistId: string,
    platform: Platform,
  ) => Promise<ContentSettings | null>
  updateContentSettings: (playlistId: string, settings: ContentSettings) => void

  blockUserRule: (
    playlistId: string,
    triggerType: string,
    triggerValue: string,
    platform: string,
  ) => Promise<boolean>
  unblockUserRule: (playlistId: string, blockId: string) => Promise<boolean>
}

export type StoreState = BaseState &
  CacheSlice &
  SlotSlice &
  RoleSlice &
  TrackOpsSlice &
  PlaybackOpsSlice &
  PlaylistSettingsSlice &
  SyncSlice &
  PlaylistRulesSlice

// ─── External Protocols & API Drivers ────────────────────────────────

export type ResponseLike = { status?: number }

export type ApiCallbacks = {
  addTrack?: (order: Order) => Promise<any>
  removeTrack?: (
    playlistId: string,
    orderId: string,
  ) => Promise<ResponseLike | void>
  playNow?: (playlistId: string, orderId: string | undefined) => Promise<any>
}

export type SocketLike = {
  on: (event: string, cb: (payload: any) => void) => void
  off: (event: string, cb?: (payload: any) => void) => void
  emit?: (event: string, payload: any) => void
}
