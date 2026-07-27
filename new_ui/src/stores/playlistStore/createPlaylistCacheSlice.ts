import {
  getActiveModeSettings,
  isBackgroundTrack,
  isVipTrack,
  mergeNowPlaying,
  mergeRulesPatch,
  mergeSettingsChanged,
  mergeTrackAdded,
  mergeTrackRemoved,
  safeEmit,
  toPlaylist,
  toTrack,
} from './helpers'

import type { StateCreator } from 'zustand'

import type { Socket } from 'socket.io-client'
import type {
  Playlist,
  PlaylistCacheEntry,
  RulesPatch,
  StoreState,
  WireTrack,
} from '@/types/playlist'
import type { PublicUser } from '@/types/user'
import { DEFAULT_SORT } from '@/types/playlist'

import { fetchPlaylistPublic } from '@/api/api-playlist'
import { computePriority } from '@/lib/utils'
import { fetchUserPublic } from '@/api/api-user'

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
  repeatMode: 'none',
  shuffle: false,

  paused_background: null,
  paused_regular: null,

  syncSeek: null,
  syncPause: null,
  acceptSync: false,

  pendingResume: null,
  pendingInterrupt: null,
})

const pendingFetches: Record<string, Promise<void> | undefined> = {}

function checkVipInterrupt(
  get: () => StoreState,
  playlistId: string,
  newTrackId: string,
) {
  const s = get()
  if (s.slots.player.playlistId !== playlistId) return

  const entry = s.cache[playlistId]
  const pl = entry?.data
  if (!pl) return

  const newTrack = pl.track_data.find((t) => t.id === newTrackId)
  if (!newTrack) return

  const currentTrackId = s.slots.player.currentTrackId
  if (!currentTrackId) return

  const modeSettings = getActiveModeSettings(pl)
  const currentTrack = pl.track_data.find((t) => t.id === currentTrackId)
  if (!currentTrack) return

  const newIsVip = isVipTrack(newTrack, modeSettings)
  const currentIsVip = isVipTrack(currentTrack, modeSettings)
  const currentIsBg = isBackgroundTrack(
    pl.mode,
    pl.background_track_ids,
    currentTrackId,
  )
  const currentIsRegular = !currentIsVip && !currentIsBg

  // 1. VIP прерывает Regular и Background
  const vipInterrupts = newIsVip && (currentIsRegular || currentIsBg)

  // 2. Regular прерывает Background
  const regularInterrupts = !newIsVip && currentIsBg

  if (!vipInterrupts && !regularInterrupts) return

  get().updateLocal(playlistId, {
    pendingInterrupt: {
      fromTrackId: currentTrackId,
      toTrackId: newTrackId,
      groupWasInterrupt: vipInterrupts ? 'regular' : 'background',
    },
  })
}

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
          owner: null as unknown as PublicUser,
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
        const owner = await fetchUserPublic(playlist.owner_id)

        set((s) => ({
          cache: {
            ...s.cache,
            [playlistId]: {
              ...s.cache[playlistId],
              owner: owner,
            },
          },
        }))
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
    get().updatePlaylistData(playlistId, (p) => mergeTrackAdded(p, wire))
    checkVipInterrupt(get, playlistId, wire.id)
  })

  socket.on(`delete_track:${playlistId}`, (trackId: { track_id: string }) => {
    get().updatePlaylistData(playlistId, (p) =>
      mergeTrackRemoved(p, trackId.track_id),
    )
  })

  socket.on(`playnow:${playlistId}`, (trackData: { track_id: string }) => {
    get().updatePlaylistData(playlistId, (p) =>
      mergeNowPlaying(p, trackData.track_id),
    )
  })

  socket.on(`settings_changed:${playlistId}`, (event: Partial<Playlist>) => {
    get().updatePlaylistData(playlistId, (p) => mergeSettingsChanged(p, event))
  })

  socket.on(`rules_changed:${playlistId}`, (event: string) => {
    const payload: RulesPatch = JSON.parse(event)
    get().updatePlaylistData(playlistId, (p) => mergeRulesPatch(p, payload))
  })

  socket.on(`playback_pause:${playlistId}`, (event: SyncPausePayload) => {
    if (!get().cache[playlistId]?.local.acceptSync) return

    get().updateLocal(playlistId, { syncPause: event })
  })

  socket.on(`playback_seek:${playlistId}`, (event: SyncSeekPayload) => {
    if (!get().cache[playlistId]?.local.acceptSync) return
    get().updateLocal(playlistId, { syncSeek: event })
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
    'rules_changed',
  ].forEach((ev) => socket.off(`${ev}:${playlistId}`))
}
