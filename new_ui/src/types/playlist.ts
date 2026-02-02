export type Order = {
  request_id: string
  owner_id: string
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
  source: string // twitch | youtube | web
  loading?: boolean // для оптимистичного состояния
}

export type SortSettings = {
  date: 'desc' | 'asc' | 'none'
  priority: 'desc' | 'asc' | 'none'
  shuffle: 'desc' | 'asc' | 'none'
}

export type PlaylistSettings = {
  id: string
  playlist_id: string

  min_views: number
  min_likes: number
  max_duration: number

  donation_currency_amount: number
  track_cooldown: number
  user_cooldown: number

  max_playlist_size: number

  is_public: boolean
  is_favorite: boolean

  mode: 'flow' | 'static'
  repeat_mode: 'all' | 'once' | 'none'
  sort_settings: SortSettings

  cost_broacaster: number
  cost_donater: number
  cost_vip: number
  cost_mod: number
  cost_subscriber: number
  cost_turbo: number
  cost_artist: number
  cost_fonder: number
  cost_follower: number

  cost_mode: 'add' | 'max'

  is_allow_external_requests: boolean
  allow_sources: Array<string>

  track_black_list: Array<string> // yt_video_id
  user_black_list: Array<string>
  created_at: string
  updated_at: string
}

export type InputPlaylist = {
  id: string
  name: string
  description?: string
  track_data: Array<Track>
  now_playing: string | undefined
  created_at: string
  updated_at: string
  settings: PlaylistSettings
}

export type ClientPlaylist = {
  id: string
  name: string
  description?: string
  track_data: Array<Track>
  isSub: boolean
  history: Array<Track>
  now_playing: Track | undefined
  created_at: string
  updated_at: string
  settings: PlaylistSettings
}

export type SortBy = 'priority' | 'date' | 'shuffle'

export type PlayNow = {
  playlist_id: string
  track_id: string
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
