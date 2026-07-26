import type { BotSettings } from './botSettings'

export interface Integration {
  id: string
  platform: string
  platform_user_id: string
  platform_avatar_url: string
  platform_username: string
  bot_connection: boolean
  bot_settings: BotSettings
  is_dead: boolean
  created_at: string
}

export interface UserProfile {
  id: string
  bio: string
  is_public: boolean
  username: string
  email?: string
  email_confirmed: boolean
  avatar_url: string
  social_links?: Record<string, string>
}

export interface UserProfileUpdatePayload {
  username?: string
  bio?: string
  is_public?: boolean
  email?: string
  profile_image_url?: string
}

export interface UserPasswordUpdatePayload {
  current_password: string
  new_password: string
}

export type PublicUser = {
  id: string
  username: string
  bio: string
  avatar_url: string
  social_links: Record<string, string> | null
  roles: Array<PublicRole>
}

export type PublicRole = {
  id: string
  user_id: string

  tier: number

  start_date: string
}
