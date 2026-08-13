export type EventOperator = {
  nickname?: string
  access_level?: 'owner' | 'moderator' | 'none'
  user_id?: string
}

export type PlaylistLog = {
  id: string
  user_id: string
  playlist_id: string
  event_type: EventType
  event_data: {
    platform?: string
    by_owner?: boolean
    operator?: EventOperator
    [key: string]: any
  }
  created_at: string
}

export enum EventType {
  ADD_TRACK = 'add_track',
  ADD_TRACK_ERROR = 'add_track_error',

  PLAY_TRACK = 'play_track',

  REMOVE_TRACK = 'remove_track',
  LISTEN_TRACK = 'listen_track',
  SKIP_TRACK = 'skip_track',
  REPORT_TRACK = 'report_track',

  CLAIM_LINK = 'claim_link',
  FAILED_CLAIM_LINK = 'failed_claim_link',
  MODERATOR_LEAVE = 'moderator_leave',
  CREATE_MODERATOR_TOKEN = 'create_moderator_token',
  ADD_MODERATOR_DIRECT = 'add_moderator_direct',
  REVOKE_MODERATOR = 'revoke_moderator',

  ERROR = 'error',
}
