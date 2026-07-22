import type {
  ApiCallbacks,
  ClientPlaylist,
  InputPlaylist,
  PlaylistMode,
  PlaylistPatch,
  PlaylistSettings,
  SocketLike,
  Track,
} from '@/types/playlist'

export type ReorderGroup = 'vip' | 'regular' | 'background'

export type StoreState = {
  input: Array<InputPlaylist>
  playlists: Array<ClientPlaylist>
  api: ApiCallbacks
  socket?: SocketLike
  getPlayerPosition: (() => number) | null
  setGetPlayerPosition: (getter: (() => number) | null) => void

  pendingAdds: Record<string, Set<string>>
  pendingPlays: Record<string, Set<string>>
  pendingRemoves: Record<string, Set<string>>

  socketHandlers: Record<string, { [event: string]: (p: any) => void }>

  setApi: (api: ApiCallbacks) => void
  setSocket: (s?: SocketLike) => void
  setPlaylistsFromServer: (pls: Array<InputPlaylist>) => void
  setPlaylist: (pls: ClientPlaylist) => void
  addPlaylist: (pls: ClientPlaylist) => void
  deletePlaylist: (playlistId: string) => void

  requestAddTrack: (
    playlistId: string,
    yt_video_id: string,
    ownerId?: string,
  ) => Promise<void>
  syncAddTrack: (playlistId: string, track: Track) => void

  requestPlayNow: (
    playlistId: string,
    track_id: string | undefined,
  ) => Promise<void>
  syncPlayNow: (playlistId: string, track: Track | undefined) => void

  requestRemoveTrack: (
    playlistId: string,
    orderId: string,
    reason?: string,
  ) => Promise<void>
  syncRemoveTrack: (playlistId: string, orderId: string) => void

  playNext: (
    pl: ClientPlaylist,
    reason?: string,
    forceNextTrack?: Track,
  ) => boolean
  playPrev: (playlistId: string) => void

  clearPausedBackground: (playlistId: string) => void

  requestPlSettings: (
    playlist_id: string,
    settings: Partial<PlaylistSettings>,
  ) => Promise<void>
  syncPlSettings: (playlistId: string, settings: PlaylistSettings) => void

  requestPlaylistPatch: (id: string, plst: PlaylistPatch) => Promise<void>
  syncPlaylistPatch: (plst: ClientPlaylist) => void

  sortPlaylist: (plst: ClientPlaylist) => ClientPlaylist

  requestReorder: (
    playlistId: string,
    mode: PlaylistMode,
    group: ReorderGroup,
    orderedIds: Array<string>,
  ) => Promise<void>
  requestReorderStep: (
    playlistId: string,
    group: ReorderGroup,
    trackId: string,
    dir: 'up' | 'down',
  ) => Promise<void>

  subscribePlaylist: (playlistId: string) => void
  unsubscribePlaylist: (playlistId: string) => void

  requestPlaybackState: (
    playlistId: string,
    is_paused: boolean,
    position: number,
    track_id: string | undefined,
  ) => Promise<void> | void
  requestSeekState: (
    playlistId: string,
    position: number,
    track_id: string | undefined,
  ) => Promise<void> | void
  requestPositionState: (
    playlistId: string,
    position: number,
  ) => Promise<void> | void
}

/** Общие типы set/get — каждый файл слайса типизируется через них, не завися
 * от инференса конкретного вызова create() в index.tsx. */
export type SetFn = (
  partial: Partial<StoreState> | ((state: StoreState) => Partial<StoreState>),
) => void
export type GetFn = () => StoreState

export type SplitQueue = {
  vip: Array<Track>
  regular: Array<Track>
  background: Array<Track> // всегда [] для static/flow
}
