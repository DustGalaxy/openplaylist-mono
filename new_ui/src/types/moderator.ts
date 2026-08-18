export type AccessLevel = 'owner' | 'moderator' | 'none'

export interface CreateChannelModeratorTokenRequest {
  name: string
  can_control_player: boolean
  can_manage_all_playlists: boolean
  expires_at?: string | null
}

export interface DirectAddChannelModeratorRequest {
  target_user_id: string
  name: string
  can_control_player: boolean
  can_manage_all_playlists: boolean
  expires_at?: string | null
}

export interface UpdateChannelModeratorRequest {
  name?: string | null
  can_control_player?: boolean | null
  can_manage_all_playlists?: boolean | null
  expires_at?: string | null
  is_active?: boolean | null
}

export interface GrantPlaylistAccessRequest {
  playlist_id: string
  can_manage_tracks: boolean
  can_manage_settings: boolean
}

export interface PlaylistAccessResponse {
  id: string
  playlist_id: string
  playlist_name?: string | null
  can_manage_tracks: boolean
  can_manage_settings: boolean
}

export interface ChannelModeratorResponse {
  id: string
  owner_id: string
  user_id?: string | null
  name: string
  user_name?: string | null
  token: string
  can_control_player: boolean
  can_manage_all_playlists: boolean
  expires_at?: string | null
  is_active: boolean
  playlist_access: Array<PlaylistAccessResponse>
  created_at: string
}

export interface ModeratedChannelResponse {
  moderator_id: string
  owner_id: string
  owner_name: string
  can_control_player: boolean
  can_manage_all_playlists: boolean
  playlist_access: Array<PlaylistAccessResponse>
  expires_at?: string | null
}

export interface ModeratorChannelAccessInfo {
  owner_id: string
  user_id?: string | null
  access_level: AccessLevel
  name: string
  can_control_player: boolean
  can_manage_all_playlists: boolean
}

export interface ModeratorPlaylistAccessInfo {
  playlist_id: string
  user_id?: string | null
  access_level: AccessLevel
  name: string
  can_manage_tracks: boolean
  can_manage_settings: boolean
}

// Backward compatibility types
export type PublicModeratorItem = ChannelModeratorResponse
export type ModeratorItemResponse = ChannelModeratorResponse
export type ModeratorAccessInfo = ModeratorPlaylistAccessInfo
