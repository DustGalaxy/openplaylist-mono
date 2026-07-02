/* eslint-disable @typescript-eslint/no-unnecessary-condition */

import { create } from 'zustand'

import { v4 as uuidv4 } from 'uuid'
import { useAuthStore } from './authStore'

import type {
  ApiCallbacks,
  ClientPlaylist,
  InputPlaylist,
  Order,
  PlayNow,
  PlaylistPatch,
  PlaylistSettings,
  SocketLike,
  Track,
} from '@/types/playlist'
import {
  addTrackToPlaylist,
  changePlaylistSettings,
  patchPlaylist,
  postPlayNow,
  removeTrackFromPlaylist,
} from '@/api/api-playlist'
import { computePriority } from '@/lib/utils'
import { getActiveModeSettings, isVipTrack, splitQueue } from '@/lib/queueSplit'

/* ---------- Типы ---------- */

/* Store */
type StoreState = {
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

  requestAddTrack: (playlistId: string, yt_video_id: string, ownerId?: string) => Promise<void>
  syncAddTrack: (playlistId: string, track: Track) => void

  requestPlayNow: (playlistId: string, track_id: string | undefined) => Promise<void>
  syncPlayNow: (playlistId: string, track: Track | undefined) => void

  requestRemoveTrack: (playlistId: string, orderId: string, reason?: string) => Promise<void>
  syncRemoveTrack: (playlistId: string, orderId: string) => void

  playNext: (pl: ClientPlaylist, reason?: string, forceNextTrack?: Track) => void
  playPrev: (playlistId: string) => void

  clearPausedBackground: (playlistId: string) => void

  requestPlSettings: (playlist_id: string, settings: Partial<PlaylistSettings>) => Promise<void>
  syncPlSettings: (playlistId: string, settings: PlaylistSettings) => void

  requestPlaylistPatch: (id: string, plst: PlaylistPatch) => Promise<void>
  syncPlaylistPatch: (plst: ClientPlaylist) => void

  sortPlaylist: (plst: ClientPlaylist) => ClientPlaylist

  subscribePlaylist: (playlistId: string) => void
  unsubscribePlaylist: (playlistId: string) => void
}

/* ---------- Implementation ---------- */

export const useMusicStore = create<StoreState>((set, get) => {
  function registerSocketHandlers(playlistId: string) {
    console.debug('registerSocketHandlers', playlistId)
    const s = get().socket
    if (!s) return
    const handlers = get().socketHandlers || {}
    if (handlers[playlistId]) return

    const addHandler = (payload: any) => {
      const parsed = payload && typeof payload === 'string' ? JSON.parse(payload) : payload
      if (!parsed) return
      const tr: Track = parsed.track ?? parsed
      get().syncAddTrack(playlistId, tr)
    }

    const playNowHandler = (payload: string) => {
      if (!payload) return
      const parsed: PlayNow = JSON.parse(payload)

      if (!parsed.track_id) {
        get().syncPlayNow(playlistId, undefined)
        return
      }

      const track = get()
        .playlists.find((p) => p.id === parsed.playlist_id)
        ?.track_data.find((t) => t.id === parsed.track_id)

      if (!track) return
      get().syncPlayNow(playlistId, track)
    }

    const removedHandler = (payload: any) => {
      if (!payload) return
      get().syncRemoveTrack(playlistId, payload.track_id)
    }

    const settingsChangedHandler = (payload: any) => {
      if (!payload) return
      const parsed = JSON.parse(payload)
      const { user } = useAuthStore.getState()
      if (user && user.id === parsed.streamer_id) return
      get().syncPlSettings(playlistId, parsed)
    }

    s.on('add_track:' + playlistId, addHandler)
    s.on('playnow:' + playlistId, playNowHandler)
    s.on('delete_track:' + playlistId, removedHandler)
    s.on('settings_changed:' + playlistId, settingsChangedHandler)
    s.on('connect', () => {
      console.debug('socket connect - re-subscribing to playlist', playlistId)
      if (s !== undefined && s.emit) s.emit('subscribe', { playlist_id: playlistId })
    })
    s.on('disconnect', () => {
      console.debug('socket disconnect - unsubscribing from playlist', playlistId)
      if (s !== undefined && s.emit) s.emit('unsubscribe', { playlist_id: playlistId })
    })

    set((st) => ({
      socketHandlers: {
        ...st.socketHandlers,
        [playlistId]: {
          addHandler,
          playNowHandler,
          removedHandler,
          settingsChangedHandler,
        },
      },
    }))
  }

  function unregisterSocketHandlers(playlistId: string) {
    const s = get().socket
    if (!s) return
    const handlers = get().socketHandlers || {}
    const h = handlers[playlistId]
    if (!h) return
    if (h.addHandler) s.off('add_track:' + playlistId, h.addHandler)
    if (h.playNowHandler) s.off('playnow:' + playlistId, h.playNowHandler)
    if (h.removedHandler) s.off('delete_track:' + playlistId, h.removedHandler)
    if (h.settingsChangedHandler) s.off('settings_changed:' + playlistId, h.settingsChangedHandler)

    const newHandlers = { ...handlers }
    delete newHandlers[playlistId]
    set(() => ({ socketHandlers: newHandlers }))
  }

  return {
    playlists: [],
    input: [],
    api: {},
    socket: undefined,
    getPlayerPosition: null,
    pendingAdds: {},
    pendingPlays: {},
    pendingRemoves: {},
    socketHandlers: {},

    setApi(api) {
      set(() => ({ api }))
    },

    setGetPlayerPosition(getter) {
      set(() => ({ getPlayerPosition: getter }))
    },

    setSocket(s) {
      if (s === get().socket) return
      set(() => ({ socket: s }))
      if (s) {
        get().playlists.forEach((plst) => get().subscribePlaylist(plst.id))
      }
    },

    setPlaylist(pls: ClientPlaylist) {
      const sorted = get().sortPlaylist(pls)
      set(() => ({
        playlists: get().playlists.map((p) => (p.id === pls.id ? sorted : p)),
      }))
    },

    addPlaylist(pls: ClientPlaylist) {
      set((state) => ({
        playlists: [...state.playlists, { ...pls, paused_background: pls.paused_background ?? null }],
      }))
      get().subscribePlaylist(pls.id)
    },

    deletePlaylist(playlistId: string) {
      get().unsubscribePlaylist(playlistId)
      const pls = get().playlists.filter((p) => p.id !== playlistId)
      set(() => ({ playlists: pls }))
    },

    setPlaylistsFromServer(pls) {
      const pl = pls.map((p) =>
        this.sortPlaylist({
          ...p,
          isSub: false,
          history: [],
          now_playing: p.track_data
            .filter((t) => t.id === p.now_playing)
            .map((t) => ({
              ...t,
              priority: computePriority(t, p.settings),
            }))[0],
          track_data: p.track_data.map((t) => ({
            ...t,
            priority: computePriority(t, p.settings),
          })),
          settings: {
            ...p.settings,
          },
          paused_background: null,
        }),
      )
      set(() => ({ playlists: pl }))
    },

    /* ---- ADD flow ---- */
    async requestAddTrack(playlistId, yt_video_url, ownerId?) {
      const { user } = useAuthStore.getState()
      var owner_id = get().playlists.find((p) => p.id === playlistId)?.owner_id
      owner_id = owner_id ? owner_id : ownerId
      if (!user || !owner_id) {
        console.debug('no user in requestAddTrack')
        return
      }
      const order: Order = {
        request_id: uuidv4(),
        owner_id: owner_id,
        owner_platform_id: user.id,
        requester_id: user.id,
        requester_nickname: user.username,
        playlist_id: playlistId,
        yt_video_url: yt_video_url,
        priority: 'bms',
        source: 'web',
      }
      console.debug('order', order)

      const addTrackFn = get().api.addTrack || addTrackToPlaylist
      await addTrackFn(order)
    },

    syncAddTrack(playlistId, track) {
      const pl = get().playlists.find((p) => p.id === playlistId)
      console.debug('syncAddTrack', playlistId, track)
      if (!pl) return

      const newTrack = {
        ...track,
        priority: computePriority(track, pl.settings),
      }

      const updatedPl = get().sortPlaylist({
        ...pl,
        track_data: [...pl.track_data, newTrack],
      })

      set((state) => ({
        playlists: state.playlists.map((p) => (p.id === playlistId ? updatedPl : p)),
      }))

      const modeSettings = getActiveModeSettings(updatedPl)
      const nowPlaying = updatedPl.now_playing
      const newTrackIsVip = isVipTrack(newTrack, modeSettings)
      const currentlyPlayingIsVip = nowPlaying !== undefined && isVipTrack(nowPlaying, modeSettings)

      if (
        newTrackIsVip &&
        nowPlaying !== undefined &&
        !currentlyPlayingIsVip &&
        !updatedPl.paused_background
      ) {
        const position = get().getPlayerPosition?.() ?? 0
        set((state) => ({
          playlists: state.playlists.map((p) =>
            p.id === playlistId
              ? {
                ...p,
                paused_background: {
                  track_id: nowPlaying.id,
                  position_seconds: position,
                },
              }
              : p,
          ),
        }))
        get().requestPlayNow(playlistId, newTrack.id)
      }
    },

    /* ---- PLAY NOW flow ---- */
    async requestPlayNow(playlistId, track_id) {
      set((state) => {
        const pending = { ...state.pendingPlays }
        if (!pending[playlistId]) pending[playlistId] = new Set()
        const newSet = new Set(pending[playlistId])
        if (track_id) newSet.add(track_id)
        return { pendingPlays: pending }
      })

      const originalPlaylists = get().playlists

      set((state) => ({
        playlists: state.playlists.map((p) => {
          if (p.id === playlistId) {
            const track = p.track_data.find((t) => t.id === track_id)
            const prevNowPlaying = p.settings.mode === 'flow' ? p.now_playing : undefined
            return {
              ...p,
              track_data: prevNowPlaying
                ? [prevNowPlaying, ...p.track_data.filter((t) => t.id !== prevNowPlaying.id)]
                : p.track_data,
              now_playing: track,
            }
          }
          return p
        }),
      }))

      try {
        const playNowFn = get().api.playNow || postPlayNow
        await playNowFn(playlistId, track_id)
      } catch (error) {
        console.error('Failed to request play now, reverting:', error)
        set((state) => {
          const pending = { ...state.pendingPlays }
          if (pending[playlistId] && track_id) {
            const newSet = new Set(pending[playlistId])
            newSet.delete(track_id)
            pending[playlistId] = newSet
          }
          return {
            pendingPlays: pending,
            playlists: originalPlaylists,
          }
        })
        throw error
      }
    },

    syncPlayNow(playlistId, track) {
      const pl = get().playlists.find((p) => p.id === playlistId)
      if (!pl) return

      const pending = get().pendingPlays[playlistId]
      const wasPending = track && pending && pending.has(track.id)

      if (wasPending) {
        set((state) => {
          const pendingPlays = { ...state.pendingPlays }
          if (pendingPlays[playlistId] && track) {
            const newSet = new Set(pendingPlays[playlistId])
            newSet.delete(track.id)
            pendingPlays[playlistId] = newSet
          }
          return { pendingPlays }
        })
      } else {
        const prevNowPlaying = pl.settings.mode === 'flow' ? pl.now_playing : undefined
        set((state) => ({
          playlists: state.playlists.map((p) =>
            p.id === playlistId
              ? {
                ...p,
                track_data: prevNowPlaying
                  ? [prevNowPlaying, ...p.track_data.filter((t) => t.id !== prevNowPlaying.id)]
                  : p.track_data,
                now_playing: track,
              }
              : p,
          ),
        }))
      }
    },

    /* ---- REMOVE flow ---- */
    async requestRemoveTrack(playlistId, orderId, reason) {
      set((state) => {
        const pending = { ...state.pendingRemoves }
        if (!pending[playlistId]) pending[playlistId] = new Set()
        const newSet = new Set(pending[playlistId])
        newSet.add(orderId)
        pending[playlistId] = newSet
        return { pendingRemoves: pending }
      })

      const originalPlaylists = get().playlists

      set((state) => ({
        playlists: state.playlists.map((p) =>
          p.id === playlistId
            ? get().sortPlaylist({
              ...p,
              track_data: p.track_data.filter((t) => t.id !== orderId),
            })
            : p,
        ),
      }))

      try {
        const removeFn = get().api.removeTrack || removeTrackFromPlaylist
        await removeFn(playlistId, orderId, reason)
      } catch (error) {
        console.error('Failed to request remove track, reverting:', error)
        set((state) => {
          const pending = { ...state.pendingRemoves }
          if (pending[playlistId]) {
            const newSet = new Set(pending[playlistId])
            newSet.delete(orderId)
            pending[playlistId] = newSet
          }
          return {
            pendingRemoves: pending,
            playlists: originalPlaylists,
          }
        })
        throw error
      }
    },

    syncRemoveTrack(playlistId, orderId) {
      const pl = get().playlists.find((p) => p.id === playlistId)
      if (!pl) return

      const pending = get().pendingRemoves[playlistId]
      const wasPending = pending && pending.has(orderId)

      if (wasPending) {
        set((state) => {
          const pendingRemoves = { ...state.pendingRemoves }
          if (pendingRemoves[playlistId]) {
            const newSet = new Set(pendingRemoves[playlistId])
            newSet.delete(orderId)
            pendingRemoves[playlistId] = newSet
          }
          return { pendingRemoves }
        })
      } else {
        set((state) => ({
          playlists: state.playlists.map((p) =>
            p.id === playlistId
              ? get().sortPlaylist({
                ...p,
                track_data: p.track_data.filter((t) => t.id !== orderId),
              })
              : p,
          ),
        }))
      }

      const freshPl = get().playlists.find((p) => p.id === playlistId)
      if (!freshPl) return

      const { user } = useAuthStore.getState()
      const isOwner = user && user.id === freshPl.owner_id

      if (freshPl.now_playing?.id === orderId && isOwner) {
        get().playNext(freshPl, 'removed')
      }
    },

    async requestPlaylistPatch(id, plst) {
      const originalPlaylists = get().playlists

      set((state) => ({
        playlists: state.playlists.map((p) => (p.id === id ? { ...p, ...plst } : p)),
      }))

      try {
        const response = await patchPlaylist(id, plst)
        get().syncPlaylistPatch(response)
      } catch (error) {
        console.error('Failed to patch playlist, reverting:', error)
        set(() => ({ playlists: originalPlaylists }))
        throw error
      }
    },

    syncPlaylistPatch(plst) {
      set((state) => ({
        playlists: state.playlists.map((p) =>
          p.id === plst.id
            ? {
              ...p,
              name: plst.name,
              description: plst.description,
              is_public: plst.is_public,
              is_favorite: plst.is_favorite,
              is_allow_external_requests: plst.is_allow_external_requests,
              allow_sources: plst.allow_sources,
              tags: plst.tags,
            }
            : p,
        ),
      }))
    },

    async requestPlSettings(playlist_id, settings) {
      const originalPlaylists = get().playlists

      set((state) => ({
        playlists: state.playlists.map((p) => {
          if (p.id === playlist_id) {
            const newSettings = {
              ...p.settings,
              ...settings,
              mode_settings: {
                ...p.settings.mode_settings,
                ...(settings.mode_settings || {}),
              },
            }
            return get().sortPlaylist({ ...p, settings: newSettings })
          }
          return p
        }),
      }))

      try {
        const res = await changePlaylistSettings(playlist_id, settings)
        get().syncPlSettings(playlist_id, res)
      } catch (error) {
        console.error('Failed to change playlist settings, reverting:', error)
        set(() => ({ playlists: originalPlaylists }))
        throw error
      }
    },

    syncPlSettings(playlist_id, settings) {
      set((state) => ({
        playlists: state.playlists.map((p) =>
          p.id === playlist_id ? get().sortPlaylist({ ...p, settings }) : p
        ),
      }))
    },

    /* ---- Playback navigation ---- */
    playNext(pl, reason, forceNextTrack) {
      set((state) => ({
        playlists: state.playlists.map((p) =>
          p.id === pl.id
            ? {
              ...p,
              history: pl.now_playing ? [...p.history, pl.now_playing].slice(-99) : p.history,
            }
            : p,
        ),
      }))

      if (forceNextTrack) {
        get().requestPlayNow(pl.id, forceNextTrack.id)
        return
      }

      const modeSettings = getActiveModeSettings(pl)
      const { vip, background } = splitQueue(pl)

      const currentWasVip = pl.now_playing !== undefined && isVipTrack(pl.now_playing, modeSettings)
      const remainingVip = pl.now_playing
        ? vip.filter((t) => t.id !== pl.now_playing?.id)
        : vip

      if (currentWasVip) {
        if (remainingVip.length > 0) {
          get().requestPlayNow(pl.id, remainingVip[0].id)
          return
        }
        if (pl.paused_background) {
          get().requestPlayNow(pl.id, pl.paused_background.track_id)
          return
        }
      } else if (remainingVip.length > 0) {
        get().requestPlayNow(pl.id, remainingVip[0].id)
        return
      }

      const repeatHandler = () => {
        if (pl.settings.shuffle) {
          const list = background.filter((t) => t.id !== pl.now_playing?.id)
          return list[Math.floor(Math.random() * list.length)]
        }
        if (pl.settings.repeat_mode === 'all') {
          if (background.length === 0) return undefined
          const lastId = background[background.length - 1].id
          if (lastId === pl.now_playing?.id) {
            return background[0]
          }
          const idx = background.findIndex((t) => t.id === pl.now_playing?.id)
          return background[idx + 1]
        }
        if (background.length === 0) return undefined
        const lastId = background[background.length - 1].id
        if (lastId === pl.now_playing?.id) return undefined
        const idx = background.findIndex((t) => t.id === pl.now_playing?.id)
        return background[idx + 1]
      }

      let nextTrack: Track | undefined

      if (pl.now_playing === undefined) {
        nextTrack = background[0] || undefined
      } else if (pl.settings.mode === 'flow') {
        nextTrack = background[0] || undefined
        get().requestRemoveTrack(pl.id, pl.now_playing.id, reason)
      } else if (pl.settings.mode === 'stream' && !currentWasVip) {
        get().requestRemoveTrack(pl.id, pl.now_playing.id, reason)
        nextTrack = background[0] || undefined
      } else {
        nextTrack = repeatHandler()
      }

      get().requestPlayNow(pl.id, nextTrack?.id || undefined)
    },

    playPrev(playlistId) {
      const pl = get().playlists.find((p) => p.id === playlistId)
      if (!pl) return

      const track = pl.history.pop()
      if (!track) return
      get().requestPlayNow(pl.id, track.id || undefined)
    },

    clearPausedBackground(playlistId) {
      set((state) => ({
        playlists: state.playlists.map((p) =>
          p.id === playlistId ? { ...p, paused_background: null } : p
        ),
      }))
    },

    sortPlaylist(playlist) {
      const { vip, background } = splitQueue(playlist)
      return { ...playlist, track_data: [...vip, ...background] }
    },

    subscribePlaylist(playlistId) {
      registerSocketHandlers(playlistId)
      set((state) => ({
        playlists: state.playlists.map((p) => (p.id === playlistId ? { ...p, isSub: true } : p)),
      }))

      const s = get().socket
      if (s !== undefined && s.emit) s.emit('subscribe', { playlist_id: playlistId })
    },

    unsubscribePlaylist(playlistId) {
      unregisterSocketHandlers(playlistId)
      set((state) => ({
        playlists: state.playlists.map((p) => (p.id === playlistId ? { ...p, isSub: false } : p)),
      }))
      const s = get().socket
      if (s !== undefined && s.emit) s.emit('unsubscribe', { playlist_id: playlistId })
    },
  }
})

export default useMusicStore