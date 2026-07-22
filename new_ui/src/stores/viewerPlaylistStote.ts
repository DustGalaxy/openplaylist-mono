import { create } from 'zustand'
import type { ClientPlaylist, SocketLike, Track } from '@/types/playlist'
import { fetchPublicPlaylist, getPlaybackState } from '@/api/api-playlist'
import { getPlsUpdsSocket } from '@/api/io-sockets'
import { splitQueue } from '@/stores/musicStore/helpers'

const DRIFT_THRESHOLD_SEC = 3

const DEFAULT_SORT: SortSettings = {
  order_mode: 'host',
  date: 'desc',
  priority: 'none',
  manual_order_ids: [],
}

function safeEmit(s: SocketLike | undefined, event: string, payload: any) {
  if (s !== undefined && s.emit) s.emit(event, payload)
}

function sortTracks(tracks: Array<Track>, s: SortSettings): Array<Track> {
  if (s.order_mode === 'free') {
    const order = new Map(s.manual_order_ids.map((id, i) => [id, i]))
    return [...tracks].sort((a, b) => {
      const ia = order.get(a.id)
      const ib = order.get(b.id)
      if (ia !== undefined && ib !== undefined) return ia - ib
      if (ia !== undefined) return -1
      if (ib !== undefined) return 1
      return a.created_at.localeCompare(b.created_at)
    })
  }
  if (s.order_mode === 'random') {
    return [...tracks].sort((a, b) => a.created_at.localeCompare(b.created_at))
  }
  return [...tracks].sort((a, b) => {
    if (s.priority !== 'none') {
      const pa = typeof a.priority === 'number' ? a.priority : 0
      const pb = typeof b.priority === 'number' ? b.priority : 0
      if (pa !== pb) return s.priority === 'asc' ? pa - pb : pb - pa
    }
    if (s.date !== 'none' && a.created_at !== b.created_at) {
      const cmp = a.created_at.localeCompare(b.created_at)
      return s.date === 'asc' ? cmp : -cmp
    }
    return 0
  })
}

type ViewerPlaylistStore = {
  playlist: ClientPlaylist | null
  loading: boolean

  mode: ViewerMode
  currentTrack: Track | undefined
  isPlaying: boolean
  seekSignal: SeekSignal
  syncing: boolean
  sort: SortSettings
  repeatMode: RepeatMode
  shuffle: boolean
  history: Array<string>

  // не React-ref — просто мутируемое поле стейта, читается через get()
  positionGetter: () => number
  // внутренний хэндл активной socket-подписки synced-режима, не для внешнего чтения
  _unsubscribeLive: (() => void) | null

  canSync: () => boolean
  getOrderedTracks: () => Array<Track>

  load: (playlistId: string) => Promise<void>
  clear: () => void

  setSort: (sort: SortSettings) => void
  setRepeatMode: (mode: RepeatMode) => void
  setShuffle: (shuffle: boolean) => void

  seek: (position: number) => void
  playTrack: (track: Track, position?: number) => void
  togglePlay: () => void
  onPlayerStateChange: (playing: boolean) => void
  next: () => void
  prev: () => void
  handleEnded: () => void
  sync: () => Promise<void>
  desync: () => void
  registerPositionGetter: (getter: () => number) => void
}

export const useViewerPlaylistStore = create<ViewerPlaylistStore>(
  (set, get) => ({
    playlist: null,
    loading: false,

    mode: 'free',
    currentTrack: undefined,
    isPlaying: false,
    seekSignal: null,
    syncing: false,
    sort: DEFAULT_SORT,
    repeatMode: 'all',
    shuffle: false,
    history: [],

    positionGetter: () => 0,
    _unsubscribeLive: null,

    canSync: () => Boolean(get().playlist?.settings.sync_playback_position),

    getOrderedTracks: () => {
      const { playlist, sort } = get()
      if (!playlist) return []
      if (sort.order_mode === 'host') {
        const { vip, regular, background } = splitQueue(playlist)
        return [...vip, ...regular, ...background]
      }
      return sortTracks(playlist.track_data, sort)
    },

    async load(playlistId) {
      get()._unsubscribeLive?.()
      set({
        loading: true,
        mode: 'free',
        currentTrack: undefined,
        isPlaying: false,
        seekSignal: null,
        history: [],
        _unsubscribeLive: null,
      })
      try {
        const pl = await fetchPublicPlaylist(playlistId) // TODO: сверить с реальным api-playlist
        set({ playlist: pl, loading: false })
      } catch (e) {
        console.debug('[viewerPlaylistStore] load failed', e)
        set({ loading: false })
      }
    },

    clear() {
      get()._unsubscribeLive?.()
      set({
        playlist: null,
        loading: false,
        mode: 'free',
        currentTrack: undefined,
        isPlaying: false,
        seekSignal: null,
        syncing: false,
        sort: DEFAULT_SORT,
        history: [],
        _unsubscribeLive: null,
      })
    },

    setSort: (sort) => set({ sort }),
    setRepeatMode: (repeatMode) => set({ repeatMode }),
    setShuffle: (shuffle) => set({ shuffle }),

    seek: (position) => set({ seekSignal: { position, token: Date.now() } }),

    playTrack: (track, position = 0) => {
      if (get().mode === 'synced') return
      const prev = get().currentTrack
      set((state) => ({
        currentTrack: track,
        history:
          prev && prev.id !== track.id
            ? [...state.history, prev.id].slice(-50)
            : state.history,
        isPlaying: true,
      }))
      get().seek(position)
    },

    togglePlay: () => {
      if (get().mode === 'synced') return
      set((state) => ({ isPlaying: !state.isPlaying }))
    },

    onPlayerStateChange: (playing) => {
      if (get().mode === 'synced') return
      set({ isPlaying: playing })
    },

    next: () => {
      const { mode, playlist } = get()
      const orderedTracks = get().getOrderedTracks()
      if (mode === 'synced' || orderedTracks.length === 0 || !playlist) return

      const { currentTrack, shuffle, repeatMode, playTrack } = get()

      if (!currentTrack) {
        playTrack(orderedTracks[0])
        return
      }
      if (shuffle) {
        const pool = orderedTracks.filter((t) => t.id !== currentTrack.id)
        if (pool.length > 0)
          playTrack(pool[Math.floor(Math.random() * pool.length)])
        return
      }
      const idx = orderedTracks.findIndex((t) => t.id === currentTrack.id)
      const nextTrack = idx === -1 ? orderedTracks[0] : orderedTracks[idx + 1]
      if (nextTrack) {
        playTrack(nextTrack)
      } else if (repeatMode === 'all') {
        playTrack(orderedTracks[0])
      } else {
        set({ isPlaying: false })
      }
    },

    prev: () => {
      const { mode, history, playlist, seek } = get()
      if (mode === 'synced' || history.length === 0 || !playlist) return
      const prevId = history[history.length - 1]
      const track = playlist.track_data.find((t) => t.id === prevId)
      set((state) => ({ history: state.history.slice(0, -1) }))
      if (track) {
        set({ currentTrack: track, isPlaying: true })
        seek(0)
      }
    },

    handleEnded: () => {
      const { mode, repeatMode, seek, next } = get()
      if (mode === 'synced') return
      if (repeatMode === 'once') {
        seek(0)
        set({ isPlaying: true })
        return
      }
      next()
    },

    desync: () => {
      get()._unsubscribeLive?.()
      set({ mode: 'free', _unsubscribeLive: null })
    },

    sync: async () => {
      const { playlist, seek } = get()
      if (!playlist?.settings.sync_playback_position) return
      set({ syncing: true })
      try {
        const state = await getPlaybackState(playlist.id)
        if (!state) return
        const track =
          playlist.track_data.find((t) => t.id === state.track_id) ??
          playlist.now_playing
        if (!track) return
        const paused = String(state.is_paused).toLowerCase() === 'true'
        const basePos = state.position ? parseFloat(state.position) : 0
        const drift =
          paused || !state.updated_at
            ? 0
            : (Date.now() - Date.parse(state.updated_at)) / 1000

        get()._unsubscribeLive?.()
        set({ mode: 'synced', currentTrack: track, isPlaying: !paused })
        seek(Math.max(0, basePos + drift))

        // живая подписка на всё время synced-режима — раньше был useEffect,
        // тут просто явный subscribe/unsubscribe вокруг перехода в synced
        const socket = getPlsUpdsSocket()

        const pauseStateHandler = (payload: any) => {
          const p = typeof payload === 'string' ? JSON.parse(payload) : payload
          if (!p || typeof p.is_paused !== 'boolean') return
          set({ isPlaying: !p.is_paused })
          if (p.position === undefined) {
            const d = p.is_paused
              ? 0
              : (Date.now() - Date.parse(p.updated_at)) / 1000
            const expected = p.position + d
            if (
              Math.abs(expected - get().positionGetter()) > DRIFT_THRESHOLD_SEC
            ) {
              get().seek(expected)
            }
            return
          }
          get().seek(p.position)
        }

        const seekStateHandler = (payload: any) => {
          const p = typeof payload === 'string' ? JSON.parse(payload) : payload
          if (!p || typeof p.position !== 'number') return
          get().seek(p.position)
        }

        const handlePlayNow = (payload: any) => {
          const p = typeof payload === 'string' ? JSON.parse(payload) : payload
          if (!p?.track_id) return
          const track = get().playlist?.track_data.find(
            (t) => t.id === p.track_id,
          )
          if (!track) return
          set({ currentTrack: track, isPlaying: true })
          get().seek(0)
        }

        safeEmit(socket, 'playback_subscribe', { playlist_id: playlist.id })
        socket.on('playback_pause:' + playlist.id, pauseStateHandler)
        socket.on('playback_seek:' + playlist.id, seekStateHandler)
        socket.on('playnow:' + playlist.id, handlePlayNow)

        set({
          _unsubscribeLive: () => {
            safeEmit(socket, 'playback_unsubscribe', {
              playlist_id: playlist.id,
            })
            socket.off('playback_pause:' + playlist.id, pauseStateHandler)
            socket.off('playback_seek:' + playlist.id, seekStateHandler)
            socket.off('playnow:' + playlist.id, handlePlayNow)
          },
        })
      } finally {
        set({ syncing: false })
      }
    },

    registerPositionGetter: (getter) => set({ positionGetter: getter }),
  }),
)
