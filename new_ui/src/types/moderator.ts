export interface ModeratorPermissions {
  can_manage_queue: boolean
  can_manage_playback: boolean
  can_manage_settings: boolean
}

export interface CreateModeratorTokenRequest {
  name: string
  permissions: ModeratorPermissions
  expires_at?: string | null
}

export interface DirectAddModeratorRequest {
  target_user_id: string
  name: string
  permissions: ModeratorPermissions
  expires_at?: string | null
}

export interface UpdateModeratorRequest {
  name?: string | null
  permissions?: ModeratorPermissions | null
  expires_at?: string | null
  is_active?: boolean | null
}

export interface ModeratorItemResponse {
  id: string
  playlist_id: string
  user_id?: string | null
  name: string
  user_name?: string | null
  token: string
  permissions: ModeratorPermissions
  expires_at?: string | null
  is_active: boolean
  created_at: string
}

export interface PublicModeratorItem {
  id: string
  playlist_id: string
  user_id?: string | null
  name: string
  user_name?: string | null
  permissions: ModeratorPermissions
  expires_at?: string | null
  is_active: boolean
  created_at: string
}

export type AccessLevel = 'owner' | 'moderator' | 'none'

export interface ModeratorAccessInfo {
  playlist_id: string
  access_level: AccessLevel
  name: string
  permissions: ModeratorPermissions
}

export interface UserModeratedPlaylistResponse {
  moderator_id: string
  playlist: {
    id: string
    name: string
    title?: string
    owner_name?: string
  }
  permissions: ModeratorPermissions
  expires_at?: string | null
}
