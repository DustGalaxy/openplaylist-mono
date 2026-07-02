import type { ReactElement } from 'react'

export enum Platform {
  General = '__general__',
  Twitch = 'twitch',
  YouTube = 'youtube',
  Web = 'web',
  DonationAlerts = 'donationalerts',
  DonateX = 'donatex',
}

export enum DonationPlatform {
  General = '__general__',
  DonationAlerts = 'donationalerts',
  DonateX = 'donatex',
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
}

export enum ExternalContentPlatform {
  Twitch = 'twitch',
  YouTube = 'youtube',
  DonationAlerts = 'donationalerts',
  DonateX = 'donatex',
}

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
}

export type Track = {
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
  slug: string
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

export type SortSettings = {
  date: 'desc' | 'asc' | 'none'
  priority: 'desc' | 'asc' | 'none'
}

export interface AllowSources {
  platform: Platform
  platform_user_id: string
}

export type PlaylistMode = 'flow' | 'static' | 'stream'

/**
 * Настройки VIP-прерывания для одного режима.
 * priority_break_point === 0 → прерывание выключено, режим ведёт себя как раньше.
 * background_track_ids используется только когда владелец режима — 'stream';
 * для flow/static остаётся пустым и игнорируется.
 */
export type ModeSettings = {
  priority_break_point: number
  sort_settings_vip: SortSettings
  sort_settings_background: SortSettings
  background_track_ids: Array<string>
}

export type ModeSettingsMap = Record<PlaylistMode, ModeSettings>

export type PlaylistSettings = {
  id: string
  playlist_id: string

  max_playlist_size: number

  mode: PlaylistMode
  repeat_mode: 'all' | 'once' | 'none'
  mode_settings: ModeSettingsMap
  shuffle: boolean
  // Переключатель "синхронизировать тайминг": true → позиция резюма хранится
  // на бэкенде (доступна с любого устройства, гостям и виджету), false →
  // только в localStorage текущего браузера.
  sync_playback_position: boolean

  cost_mode: 'add' | 'max'

  content_settings: Array<ContentSettings>
  donation_rules: Array<ReadDonationRules>
  chat_rules: Array<ReadChatRules>
  block_list: Array<ReadBlockList>

  track_black_list: Array<string> // yt_video_id

  created_at: string
  updated_at: string
}

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

export type PlaylistPatch = {
  name?: string
  description?: string
  tags?: Array<string>
  allow_sources?: Array<AllowSources>
  is_public?: boolean
  is_favorite?: boolean
  is_allow_external_requests?: boolean
}

/** Прерванный VIP-заявкой фоновый трек — чисто клиентское состояние, на бэкенд не уходит. */
export type PausedBackgroundTrack = {
  track_id: string
  position_seconds: number
}

export type ClientPlaylist = {
  id: string
  owner_id: string
  name: string
  description?: string
  is_public: boolean
  is_favorite: boolean
  is_allow_external_requests: boolean
  tags: Array<string>
  allow_sources: Array<AllowSources>
  show_in_widget: boolean
  track_data: Array<Track>

  isSub: boolean
  history: Array<Track>
  now_playing: Track | undefined
  created_at: string
  updated_at: string
  settings: PlaylistSettings

  paused_background: PausedBackgroundTrack | null
}

export type SortBy = 'priority' | 'date' | 'shuffle'

export type PlayNow = {
  playlist_id: string
  track_id: string
}

/**
 * Позиция воспроизведения для восстановления после перезагрузки страницы.
 * Независима от paused_background — пишется на любую смену/паузу трека,
 * не только на VIP-прерывания. Источник — localStorage либо бэкенд
 * (переключатель "синхронизировать тайминг" в настройках виджета/плейлиста).
 */
export type PlaybackPosition = {
  track_id: string
  position_seconds: number
  updated_at: string // ISO
}

/* API callbacks — передаются извне приложением */
export type ApiCallbacks = {
  addTrack?: (order: Order) => Promise<any>
  removeTrack?: (
    playlistId: string,
    orderId: string,
  ) => Promise<ResponseLike | void>
  playNow?: (playlistId: string, orderId: string) => Promise<any>
  // прочие методы при необходимости
}

export type ResponseLike = { status?: number }

/* Socket minimal интерфейс (передаётся извне) */
export type SocketLike = {
  on: (event: string, cb: (payload: any) => void) => void
  off: (event: string, cb?: (payload: any) => void) => void
  emit?: (event: string, payload: any) => void
}