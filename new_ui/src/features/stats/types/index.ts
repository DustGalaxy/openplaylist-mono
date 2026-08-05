export type StatsPeriod = '24h' | '7d' | '30d' | 'all_time'

export interface TopTrack {
  yt_video_id: string
  title: string
  count: number
  total_duration: number
}

export interface TopStreamer {
  entity_id: string
  name: string
  count: number
}

export interface TopRequester {
  entity_id: string
  name: string
  count: number
}

export interface PlatformBreakdown {
  platform: string
  count: number
}

export interface StatusBreakdown {
  status: string
  count: number
}

export interface ModeBreakdown {
  platform: string
  count: number
}

export interface OutgoingStats {
  total_orders: number
  total_duration_seconds: number
  top_tracks: TopTrack[]
  top_streamers: TopStreamer[]
  platform_breakdown: PlatformBreakdown[]
  status_breakdown: StatusBreakdown[]
}

export interface IncomingStats {
  total_orders: number
  total_duration_seconds: number
  top_tracks: TopTrack[]
  owner_vs_viewer?: Record<string, number> | { owner?: number; viewer?: number } | null
  top_requesters: TopRequester[]
  platform_breakdown: PlatformBreakdown[]
  auto_blocked_count?: number
  donation_summary?: Record<string, number> | null
}

export interface GlobalStats {
  total_orders: number
  total_duration_seconds: number
  top_tracks: TopTrack[]
  platform_breakdown: PlatformBreakdown[]
  mode_breakdown?: ModeBreakdown[]
}

export interface UserPublicStats {
  user_id: string
  period: StatsPeriod
  outgoing?: OutgoingStats | null
  incoming?: IncomingStats | null
}

export interface UserStatsVisibilitySettings {
  show_outgoing_stats: boolean
  show_incoming_stats: boolean
  show_top_tracks: boolean
  show_top_streamers: boolean
  show_top_requesters: boolean
  show_donations: boolean
  show_moderation_stats: boolean
}
