import {
  mergeNowPlaying,
  mergeSettingsChanged,
  mergeTrackAdded,
  mergeTrackRemoved,
  safeEmit,
  toPlaylist,
} from './helpers'
import { DEFAULT_SORT } from './types'
import type {
  Playlist,
  PlaylistCacheEntry,
  StoreState,
  SyncPausePayload,
  SyncSeekPayload,
  WireTrack,
} from './types'
import type { StateCreator } from 'zustand'

import type { Socket } from 'socket.io-client'
import type { PlaylistSettings, Track } from '@/types/playlist'
import { fetchPlaylistPublic } from '@/api/api-playlist'

export interface CacheSlice {
  cache: Record<string, PlaylistCacheEntry>
  attachPlaylist: (playlistId: string) => void
  detachPlaylist: (playlistId: string) => void
  updateLocal: (
    playlistId: string,
    patch: Partial<PlaylistCacheEntry['local']>,
  ) => void
  updatePlaylistData: (
    playlistId: string,
    fn: (p: PlaylistCacheEntry['data']) => PlaylistCacheEntry['data'],
  ) => void
  registerSocketLifecycle: () => void // called once from setSocket
}

const emptyLocal = (): PlaylistCacheEntry['local'] => ({
  history: [],
  sortOverride: DEFAULT_SORT,
  paused_background: null,
  playbackPosition: null,
  syncSeek: null,
  syncPause: null,
  pendingResume: null,
  acceptSync: false,
  broadcasting: false,
})
const pendingFetches: Record<string, Promise<void> | undefined> = {}
export const createPlaylistCacheSlice: StateCreator<
  StoreState,
  [],
  [],
  Pick<StoreState, keyof CacheSlice>
> = (set, get) => ({
  cache: {},

  attachPlaylist: async (playlistId) => {
    const existing = get().cache[playlistId]

    if (existing) {
      if (existing.refCount === 0) bindPlaylistEvents(playlistId, get)
      set((s) => ({
        cache: {
          ...s.cache,
          [playlistId]: { ...existing, refCount: existing.refCount + 1 },
        },
      }))
      // a fetch may already be in flight for this id — wait for it so callers never see stale data: null
      if (pendingFetches[playlistId]) await pendingFetches[playlistId]
      return
    }

    bindPlaylistEvents(playlistId, get)
    safeEmit(get().socket, 'subscribe', { playlist_id: playlistId })

    set((s) => ({
      cache: {
        ...s.cache,
        [playlistId]: {
          data: null as unknown as Playlist,
          refCount: 1,
          local: emptyLocal(),
        },
      },
    }))

    const fetchPromise = (async () => {
      const input = await fetchPlaylistPublic(playlistId)
      if (input) {
        const playlist = toPlaylist(input)
        get().updatePlaylistData(playlistId, () => playlist)
      }
    })()

    pendingFetches[playlistId] = fetchPromise
    try {
      await fetchPromise
    } finally {
      delete pendingFetches[playlistId]
    }
  },

  detachPlaylist: (playlistId) => {
    const entry = get().cache[playlistId]
    if (!entry) return
    const refCount = entry.refCount - 1

    if (refCount <= 0) {
      unbindPlaylistEvents(playlistId, get().socket)
      safeEmit(get().socket, 'unsubscribe', { playlist_id: playlistId })
      set((s) => {
        const { [playlistId]: _drop, ...rest } = s.cache
        return { cache: rest }
      })
      return
    }
    set((s) => ({
      cache: { ...s.cache, [playlistId]: { ...entry, refCount } },
    }))
  },

  setSocket: (socket) => {
    const prevSocket = get().socket
    const attachedIds = Object.keys(get().cache)

    if (prevSocket) {
      attachedIds.forEach((id) => unbindPlaylistEvents(id, prevSocket))
      prevSocket.off('connect')
      prevSocket.disconnect()
    }

    set({ socket })

    if (socket) {
      attachedIds.forEach((id) => {
        bindPlaylistEvents(id, get)
        safeEmit(socket, 'subscribe', { playlist_id: id })
      })
      get().registerSocketLifecycle()
    }
  },

  updateLocal: (playlistId, patch) =>
    set((s) => {
      const entry = s.cache[playlistId]
      if (!entry) return s
      return {
        cache: {
          ...s.cache,
          [playlistId]: { ...entry, local: { ...entry.local, ...patch } },
        },
      }
    }),

  // called once when socket instance is set (see setSocket in base slice)
  updatePlaylistData: (playlistId, fn) =>
    set((s) => {
      const entry = s.cache[playlistId]
      if (!entry) return s
      return {
        cache: { ...s.cache, [playlistId]: { ...entry, data: fn(entry.data) } },
      }
    }),

  registerSocketLifecycle: () => {
    const socket = get().socket
    if (!socket) return
    socket.on('connect', () => {
      Object.keys(get().cache).forEach((id) =>
        safeEmit(socket, 'subscribe', { playlist_id: id }),
      )
    })
  },
})

function bindPlaylistEvents(playlistId: string, get: () => StoreState) {
  const socket = get().socket
  if (!socket) return

  socket.on(`add_track:${playlistId}`, (wire: WireTrack) => {
    console.log('wire = ', wire)

    get().updatePlaylistData(playlistId, (p) => mergeTrackAdded(p, wire))
  })

  socket.on(`delete_track:${playlistId}`, (trackId: string) =>
    get().updatePlaylistData(playlistId, (p) => mergeTrackRemoved(p, trackId)),
  )

  socket.on(`playnow:${playlistId}`, (trackData: string) => {
    const payload = JSON.parse(trackData)
    get().updatePlaylistData(playlistId, (p) =>
      mergeNowPlaying(p, payload.track_id),
    )
  })

  socket.on(`settings_changed:${playlistId}`, (settings: PlaylistSettings) =>
    get().updatePlaylistData(playlistId, (p) =>
      mergeSettingsChanged(p, settings),
    ),
  )

  socket.on(`playback_pause:${playlistId}`, (event: string) => {
    if (!get().cache[playlistId]?.local.acceptSync) return
    const payload = JSON.parse(event)
    console.log(`playback_pause:${playlistId} incoming = `, payload)

    get().updateLocal(playlistId, { syncPause: payload })
  })

  socket.on(`playback_seek:${playlistId}`, (event: string) => {
    if (!get().cache[playlistId]?.local.acceptSync) return
    const payload = JSON.parse(event)
    console.log(`playback_seek:${playlistId} incoming = `, payload)
    get().updateLocal(playlistId, { syncSeek: payload })
  })
}

function unbindPlaylistEvents(playlistId: string, socket: Socket) {
  ;[
    'add_track',
    'delete_track',
    'playnow',
    'settings_changed',
    'playback_pause',
    'playback_seek',
  ].forEach((ev) => socket.off(`${ev}:${playlistId}`))
}
