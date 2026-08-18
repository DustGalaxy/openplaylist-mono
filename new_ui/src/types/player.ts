export type PlayerMode = 'listen' | 'control'

export interface PlayerState {
  owner_id: string
  active_playlist_id: string | null
  current_track_id: string | null
  current_track_data: Record<string, any> | null
  position: number
  is_paused: boolean
  volume: number
  broadcast_to_widget: boolean
  last_client_id: string | null
  updated_at?: string | null
}

export interface PlayerPlayRequest {
  track_id: string
  playlist_id: string
  client_id: string
  position?: number
}

export interface PlayerPauseRequest {
  is_paused: boolean
  position: number
  client_id: string
}

export interface PlayerSeekRequest {
  position: number
  client_id: string
}

export interface PlayerVolumeRequest {
  volume: number
  client_id: string
}

export interface PlayerBroadcastRequest {
  enabled: boolean
  client_id: string
}

export interface ActiveChannel {
  owner_id: string
  name: string
  is_owner: boolean
  can_control_player: boolean
  can_manage_all_playlists: boolean
}
