export interface Integration {
  id: string
  platform: string
  platform_user_id: string
  platform_avatar_url: string
  platform_username: string
  bot_connection: boolean
  created_at: string
}

export interface UserProfile {
  id: string
  curr_platform: string
  username: string
  email?: string
  email_confirmed: boolean
  avatar_url: string
  social_links?: Record<string, string>
}

export interface UserProfileUpdatePayload {
  username?: string
  email?: string
  profile_image_url?: string
}

export interface UserPasswordUpdatePayload {
  current_password: string
  new_password: string
}
