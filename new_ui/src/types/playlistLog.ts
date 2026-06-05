export type PlaylistLog = {
  id: string
  user_id: string
  playlist_id: string
  event_type: EventType
  event_data: {
    platform: string
    by_owner: boolean
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

  ERROR = 'error',
}
