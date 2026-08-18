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
import { CLIENT_ID } from '@/lib/clientId'
import { usePlaybackStore } from '@/stores/playbackStore'

interface SyncPausePayload {
  is_paused: boolean
  position: number
  track_id: string
  client_id?: string
}

interface SyncSeekPayload {
  position: number
  track_id: string
  client_id?: string
}

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
    if (
      !playlistId ||
      playlistId === 'undefined' ||
      playlistId === 'null' ||
      !playlistId.trim()
    ) {
      return
    }

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
    safeEmit(get().socket, 'playback_subscribe', { playlist_id: playlistId })

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
      safeEmit(get().socket, 'playback_unsubscribe', { playlist_id: playlistId })
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
      unbindGlobalPlayerEvents(prevSocket)
      prevSocket.off('connect')
      prevSocket.disconnect()
    }

    set({ socket })

    if (socket) {
      bindGlobalPlayerEvents(socket, get)
      const currentOwnerId =
        usePlaybackStore?.getState?.()?.activeChannel?.owner_id || get().userId
      if (currentOwnerId) {
        safeEmit(socket, 'player_subscribe', { owner_id: currentOwnerId })
      }
      attachedIds.forEach((id) => {
        bindPlaylistEvents(id, get)
        safeEmit(socket, 'subscribe', { playlist_id: id })
        safeEmit(socket, 'playback_subscribe', { playlist_id: id })
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
      const currentOwnerId =
        usePlaybackStore?.getState?.()?.activeChannel?.owner_id || get().userId
      if (currentOwnerId) {
        safeEmit(socket, 'player_subscribe', { owner_id: currentOwnerId })
      }
      Object.keys(get().cache).forEach((id) => {
        safeEmit(socket, 'subscribe', { playlist_id: id })
        safeEmit(socket, 'playback_subscribe', { playlist_id: id })
      })
    })
  },
})

function bindGlobalPlayerEvents(socket: Socket, get: () => StoreState) {
  socket.on(
    'player_track_change',
    async (data: {
      track: any
      playlist_id: string
      client_id: string
      owner_id: string
    }) => {
      if (data.client_id === CLIENT_ID) return
      const s = get()
      const currentOwnerId =
        usePlaybackStore?.getState?.()?.activeChannel?.owner_id || s.userId
      if (data.owner_id && currentOwnerId && data.owner_id !== currentOwnerId)
        return

      if (usePlaybackStore?.getState) {
        usePlaybackStore.getState().setPlayerState({
          owner_id: data.owner_id,
          active_playlist_id: data.playlist_id,
          current_track_id: data.track?.id,
          current_track_data: data.track,
          position: 0,
          is_paused: false,
          volume: 100,
          broadcast_to_widget: true,
          last_client_id: data.client_id,
          updated_at: new Date().toISOString(),
        })
      }

      const isOwner = s.userId === data.owner_id
      const playerMode = usePlaybackStore?.getState?.()?.playerMode
      const local = s.slots.player.playlistId
        ? s.cache[s.slots.player.playlistId]?.local
        : undefined
      const isSyncing = !!local?.acceptSync

      // Only affect local player slot if user is stream owner, or has remote control / sync active
      if (!isOwner && playerMode !== 'control' && !isSyncing) {
        return
      }

      if (data.playlist_id) {
        if (s.slots.player.playlistId !== data.playlist_id) {
          await s.setSlotPlaylist('player', data.playlist_id)
        }
      }
      if (data.track?.id) {
        s.setPlayerTrack(data.track.id)
      }
    },
  )

  socket.on(
    'player_pause',
    (data: {
      is_paused: boolean
      position: number
      client_id: string
      owner_id: string
    }) => {
      if (data.client_id === CLIENT_ID) return
      const s = get()
      const currentOwnerId =
        usePlaybackStore?.getState?.()?.activeChannel?.owner_id || s.userId
      if (data.owner_id && currentOwnerId && data.owner_id !== currentOwnerId)
        return

      const isOwner = s.userId === data.owner_id
      const playerMode = usePlaybackStore?.getState?.()?.playerMode
      const local = s.slots.player.playlistId
        ? s.cache[s.slots.player.playlistId]?.local
        : undefined
      const isSyncing = !!local?.acceptSync

      if (!isOwner && playerMode !== 'control' && !isSyncing) {
        return
      }

      const playlistId = s.slots.player.playlistId
      if (playlistId) {
        s.updateLocal(playlistId, {
          syncPause: {
            is_paused: data.is_paused,
            position: data.position,
            track_id: s.slots.player.currentTrackId || '',
            client_id: data.client_id,
          },
        })
      }
    },
  )

  socket.on(
    'player_seek',
    (data: { position: number; client_id: string; owner_id: string }) => {
      if (data.client_id === CLIENT_ID) return
      const s = get()
      const currentOwnerId =
        usePlaybackStore?.getState?.()?.activeChannel?.owner_id || s.userId
      if (data.owner_id && currentOwnerId && data.owner_id !== currentOwnerId)
        return

      const isOwner = s.userId === data.owner_id
      const playerMode = usePlaybackStore?.getState?.()?.playerMode
      const local = s.slots.player.playlistId
        ? s.cache[s.slots.player.playlistId]?.local
        : undefined
      const isSyncing = !!local?.acceptSync

      if (!isOwner && playerMode !== 'control' && !isSyncing) {
        return
      }

      const playlistId = s.slots.player.playlistId
      if (playlistId) {
        s.updateLocal(playlistId, {
          syncSeek: {
            position: data.position,
            track_id: s.slots.player.currentTrackId || '',
            client_id: data.client_id,
          },
        })
      }
    },
  )
}

function unbindGlobalPlayerEvents(socket: Socket) {
  ;['player_track_change', 'player_pause', 'player_seek', 'player_volume'].forEach(
    (ev) => socket.off(ev),
  )
}

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
  socket.on(
    `bulk_delete_tracks:${playlistId}`,
    (data: { ids: Array<string> }) => {
      console.log(data.ids)

      get().updatePlaylistData(playlistId, (p) => {
        for (const element of data.ids) {
          p = mergeTrackRemoved(p, element)
        }
        return p
      })
    },
  )
  socket.on(`playnow:${playlistId}`, async (trackData: { track_id: string }) => {
    get().updatePlaylistData(playlistId, (p) =>
      mergeNowPlaying(p, trackData.track_id),
    )
    const s = get()
    const playerPlaylistId = s.slots.player.playlistId
    const isOwner = s.userId === s.cache[playlistId]?.data?.owner_id
    const isSyncing = !!s.cache[playlistId]?.local.acceptSync
    const playerMode = usePlaybackStore.getState().playerMode

    if (isOwner || isSyncing || playerMode === 'control') {
      if (playerPlaylistId !== playlistId) {
        await s.setSlotPlaylist('player', playlistId)
      }
      if (
        trackData.track_id &&
        trackData.track_id !== s.slots.player.currentTrackId
      ) {
        s.setPlayerTrack(trackData.track_id)
      }
    }
  })

  socket.on(`settings_changed:${playlistId}`, (event: Partial<Playlist>) => {
    console.log('settings_changed = ', event)

    get().updatePlaylistData(playlistId, (p) => mergeSettingsChanged(p, event))
  })

  socket.on(`rules_changed:${playlistId}`, (event: string) => {
    const payload: RulesPatch = JSON.parse(event)
    get().updatePlaylistData(playlistId, (p) => mergeRulesPatch(p, payload))
  })

  socket.on(`playback_pause:${playlistId}`, (event: SyncPausePayload) => {
    if (event.client_id === CLIENT_ID) return
    const s = get()
    const entry = s.cache[playlistId]
    const isOwner = s.userId === s.cache[playlistId]?.data?.owner_id
    const isSyncing = !!entry?.local.acceptSync
    const playerMode = usePlaybackStore.getState().playerMode

    if (isOwner || isSyncing || playerMode === 'control') {
      get().updateLocal(playlistId, { syncPause: event })
    }
  })

  socket.on(`playback_seek:${playlistId}`, (event: SyncSeekPayload) => {
    if (event.client_id === CLIENT_ID) return
    const s = get()
    const entry = s.cache[playlistId]
    const isOwner = s.userId === s.cache[playlistId]?.data?.owner_id
    const isSyncing = !!entry?.local.acceptSync
    const playerMode = usePlaybackStore.getState().playerMode

    if (isOwner || isSyncing || playerMode === 'control') {
      get().updateLocal(playlistId, { syncSeek: event })
    }
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
