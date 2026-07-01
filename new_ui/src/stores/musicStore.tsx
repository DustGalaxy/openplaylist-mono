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

/* ---------- Типы ---------- */

/* Store */
type StoreState = {
  // source data (получены извне react-query и установлены в store)
  input: Array<InputPlaylist>

  playlists: Array<ClientPlaylist>

  // API & socket
  api: ApiCallbacks
  socket?: SocketLike

  // optimistic metadata: наборы orderId для операций чтобы понимать, что мы уже сделали оптимистично
  pendingAdds: Record<string, Set<string>> // playlistId -> set(orderId)
  pendingPlays: Record<string, Set<string>> // playlistId -> set(orderId) (playNow)
  pendingRemoves: Record<string, Set<string>> // playlistId -> set(orderId)

  // handlers map для socket (чтобы корректно отписывать)
  socketHandlers: Record<string, { [event: string]: (p: any) => void }>

  /* ========== actions ========== */

  // init
  setApi: (api: ApiCallbacks) => void
  setSocket: (s?: SocketLike) => void
  // load playlists (react-query получает и передаёт сюда)
  setPlaylistsFromServer: (pls: Array<InputPlaylist>) => void
  setPlaylist: (pls: ClientPlaylist) => void
  addPlaylist: (pls: ClientPlaylist) => void
  deletePlaylist: (playlistId: string) => void

  // add track flow
  // optimistic + server request
  requestAddTrack: (
    playlistId: string,
    yt_video_id: string,
    ownerId?: string,
  ) => Promise<void>
  syncAddTrack: (playlistId: string, track: Track) => void // вызывается из socket handler

  requestPlayNow: (
    playlistId: string,
    track_id: string | undefined,
  ) => Promise<void>
  syncPlayNow: (playlistId: string, track: Track | undefined) => void // вызывается из socket

  requestRemoveTrack: (
    playlistId: string,
    orderId: string,
    reason?: string,
  ) => Promise<void>
  syncRemoveTrack: (playlistId: string, orderId: string) => void

  // playback controls (local)
  playNext: (
    pl: string | ClientPlaylist,
    reason?: string,
    forceNextTrack?: Track,
  ) => void
  playPrev: (playlistId: string) => void

  requestPlSettings: (
    playlist_id: string,
    settings: Partial<PlaylistSettings>,
  ) => Promise<void>
  syncPlSettings: (playlistId: string, settings: PlaylistSettings) => void

  requestPlaylistPatch: (id: string, plst: PlaylistPatch) => Promise<void>
  syncPlaylistPatch: (plst: ClientPlaylist) => void

  // flags & sort
  sortPlaylist: (plst: ClientPlaylist) => ClientPlaylist

  // subscription management for socket
  subscribePlaylist: (playlistId: string) => void
  unsubscribePlaylist: (playlistId: string) => void
}

/* ---------- Implementation ---------- */

export const useMusicStore = create<StoreState>((set, get) => {
  // socket registration helpers
  function registerSocketHandlers(playlistId: string) {
    console.debug('registerSocketHandlers', playlistId)
    const s = get().socket
    if (!s) return
    const handlers = get().socketHandlers || {}
    if (handlers[playlistId]) return // already registered

    // add_handler: payload { playlist_id, track }
    const addHandler = (payload: any) => {
      const parsed =
        payload && typeof payload === 'string' ? JSON.parse(payload) : payload
      if (!parsed) return
      const tr: Track = parsed.track ?? parsed
      get().syncAddTrack(playlistId, tr)
    }

    // playnow_handler: payload { playlist_id, order_id }
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

    // removed handler (server may broadcast removals) payload { playlist_id, order_id }
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

    const connectHandler = () => {
      console.debug('socket connect - re-subscribing to playlist', playlistId)
      if (s !== undefined && s.emit)
        s.emit('subscribe', { playlist_id: playlistId })
    }

    const disconnectHandler = () => {
      console.debug(
        'socket disconnect - unsubscribing from playlist',
        playlistId,
      )
      if (s !== undefined && s.emit)
        s.emit('unsubscribe', { playlist_id: playlistId })
    }

    s.on('add_track:' + playlistId, addHandler)
    s.on('playnow:' + playlistId, playNowHandler)
    s.on('delete_track:' + playlistId, removedHandler)
    s.on('settings_changed:' + playlistId, settingsChangedHandler)
    s.on('connect', connectHandler)
    s.on('disconnect', disconnectHandler)

    set((st) => ({
      socketHandlers: {
        ...st.socketHandlers,
        [playlistId]: {
          addHandler,
          playNowHandler,
          removedHandler,
          settingsChangedHandler,
          connectHandler,
          disconnectHandler,
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
    if (h.settingsChangedHandler)
      s.off('settings_changed:' + playlistId, h.settingsChangedHandler)
    if (h.connectHandler) s.off('connect', h.connectHandler)
    if (h.disconnectHandler) s.off('disconnect', h.disconnectHandler)

    const newHandlers = { ...handlers }
    delete newHandlers[playlistId]
    set(() => ({ socketHandlers: newHandlers }))
  }

  /* ========== store state & actions ========== */
  return {
    playlists: [],
    input: [],
    api: {},
    socket: undefined,
    pendingAdds: {},
    pendingPlays: {},
    pendingRemoves: {},
    socketHandlers: {},

    /* ---- init ---- */
    setApi(api) {
      set(() => ({ api }))
    },

    setSocket(s) {
      const oldSocket = get().socket
      if (s === oldSocket) return

      if (oldSocket) {
        get().playlists.forEach((plst) => {
          const handlers = get().socketHandlers || {}
          const h = handlers[plst.id]
          if (h) {
            if (h.addHandler) oldSocket.off('add_track:' + plst.id, h.addHandler)
            if (h.playNowHandler) oldSocket.off('playnow:' + plst.id, h.playNowHandler)
            if (h.removedHandler) oldSocket.off('delete_track:' + plst.id, h.removedHandler)
            if (h.settingsChangedHandler)
              oldSocket.off('settings_changed:' + plst.id, h.settingsChangedHandler)
            if (h.connectHandler) oldSocket.off('connect', h.connectHandler)
            if (h.disconnectHandler) oldSocket.off('disconnect', h.disconnectHandler)
          }
        })
        set(() => ({ socketHandlers: {} }))
      }

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
        playlists: [...state.playlists, pls],
      }))
      get().subscribePlaylist(pls.id)
    },

    deletePlaylist(playlistId: string) {
      // unsubscribe if subscribed
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
        }),
      )
      set(() => ({ playlists: pl }))
    },

    /* ---- ADD flow ---- */
    async requestAddTrack(playlistId: string, yt_video_url: string, ownerId?: string) {
      // optimistic: add to playlist
      const { user } = useAuthStore.getState()
      const foundOwnerId = get().playlists.find((p) => p.id === playlistId)?.owner_id
      const owner_id = foundOwnerId || ownerId
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

    // server sync (socket handler должен вызвать это)
    syncAddTrack(playlistId: string, track: Track) {
      const pl = get().playlists.find((p) => p.id === playlistId)
      console.debug('syncAddTrack', playlistId, track)
      if (!pl) {
        console.debug('no playlist in syncAddTrack')
        return
      }

      // Создаем новый объект трека с обновленным приоритетом
      const newTrack = {
        ...track,
        priority: computePriority(track, pl.settings),
      }

      set((state) => ({
        playlists: state.playlists.map((p) =>
          p.id === playlistId
            ? get().sortPlaylist({
              ...p,
              track_data: [...p.track_data, newTrack],
            })
            : p,
        ),
      }))
    },

    /* ---- PLAY NOW flow ---- */
    async requestPlayNow(playlistId: string, track_id: string | undefined) {
      console.debug('requestPlayNow', playlistId, track_id)

      // Add to pendingPlays to identify our own updates
      set((state) => {
        const pending = { ...state.pendingPlays }
        if (!pending[playlistId]) {
          pending[playlistId] = new Set()
        }
        const newSet = new Set(pending[playlistId])
        if (track_id) {
          newSet.add(track_id)
        }
        pending[playlistId] = newSet
        return { pendingPlays: pending }
      })

      // Store original playlists state in case we need to revert
      const originalPlaylists = get().playlists

      // Apply optimistic update immediately
      set((state) => ({
        playlists: state.playlists.map((p) => {
          if (p.id === playlistId) {
            const track = p.track_data.find((t) => t.id === track_id)
            const prevNowPlaying = p.settings.mode === 'flow' ? p.now_playing : undefined
            return {
              ...p,
              track_data: prevNowPlaying
                ? [
                  prevNowPlaying,
                  ...p.track_data.filter((t) => t.id !== prevNowPlaying.id),
                ]
                : p.track_data,
              now_playing: track,
            }
          }
          return p
        })
      }))

      try {
        const playNowFn = get().api.playNow || postPlayNow
        await (playNowFn as (playlistId: string, trackId?: string) => Promise<any>)(playlistId, track_id)
      } catch (error) {
        console.error('Failed to request play now, reverting optimistic update:', error)
        // Revert pending state and playlist state
        set((state) => {
          const pending = { ...state.pendingPlays }
          if (pending[playlistId] && track_id) {
            const newSet = new Set(pending[playlistId])
            newSet.delete(track_id)
            pending[playlistId] = newSet
          }
          return {
            pendingPlays: pending,
            playlists: originalPlaylists
          }
        })
        throw error
      }
    },

    // called by socket when server broadcasts playnow
    syncPlayNow(playlistId: string, track: Track | undefined) {
      const pl = get().playlists.find((p) => p.id === playlistId)
      if (!pl) return

      console.debug('syncPlayNow', playlistId, track)

      // Check if we initiated this play now request optimistically
      const pending = get().pendingPlays[playlistId]
      const wasPending = track && pending && pending.has(track.id)

      if (wasPending) {
        // Just clean up from pending
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
        // Apply update from server since it was initiated by another client
        const prevNowPlaying =
          pl.settings.mode === 'flow' ? pl.now_playing : undefined

        set((state) => ({
          playlists: state.playlists.map((p) =>
            p.id === playlistId
              ? {
                ...p,
                track_data: prevNowPlaying
                  ? [
                    prevNowPlaying,
                    ...p.track_data.filter((t) => t.id !== prevNowPlaying.id),
                  ]
                  : p.track_data,
                now_playing: track,
              }
              : p,
          ),
        }))
      }
    },

    /* ---- REMOVE flow ---- */
    async requestRemoveTrack(playlistId: string, orderId: string, reason?: string) {
      console.debug(
        'requestRemoveTrack, playlistId - ',
        playlistId,
        'orderId - ',
        orderId,
      )

      // Add to pendingRemoves to identify our own updates
      set((state) => {
        const pending = { ...state.pendingRemoves }
        if (!pending[playlistId]) {
          pending[playlistId] = new Set()
        }
        const newSet = new Set(pending[playlistId])
        newSet.add(orderId)
        pending[playlistId] = newSet
        return { pendingRemoves: pending }
      })

      // Store original playlists state in case we need to revert
      const originalPlaylists = get().playlists

      // Apply optimistic update immediately
      set((state) => ({
        playlists: state.playlists.map((p) =>
          p.id === playlistId
            ? get().sortPlaylist({
              ...p,
              track_data: p.track_data.filter((t) => t.id !== orderId),
            })
            : p,
        )
      }))

      try {
        const removeFn = get().api.removeTrack || removeTrackFromPlaylist
        await removeFn(playlistId, orderId, reason)
      } catch (error) {
        console.error('Failed to request remove track, reverting optimistic update:', error)
        // Revert pending state and playlist state
        set((state) => {
          const pending = { ...state.pendingRemoves }
          if (pending[playlistId]) {
            const newSet = new Set(pending[playlistId])
            newSet.delete(orderId)
            pending[playlistId] = newSet
          }
          return {
            pendingRemoves: pending,
            playlists: originalPlaylists
          }
        })
        throw error
      }
    },

    syncRemoveTrack(playlistId: string, orderId: string) {
      console.debug('syncRemoveTrack', playlistId, orderId)

      // Check if we initiated this remove request optimistically
      const pending = get().pendingRemoves[playlistId]
      const wasPending = pending && pending.has(orderId)

      if (wasPending) {
        // Clean up from pending
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
        // Apply update from server since it was initiated by another client
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

      // Check if the deleted track was currently playing
      // Get fresh playlist data to avoid stale objects and potential infinite loops
      const freshPl = get().playlists.find((p) => p.id === playlistId)
      if (!freshPl) return

      // ONLY the owner/streamer of the playlist should trigger next track playback changes!
      const { user } = useAuthStore.getState()
      const isOwner = user && user.id === freshPl.owner_id

      if (freshPl.now_playing?.id === orderId && isOwner) {
        get().playNext(freshPl, 'removed')
      }
    },

    async requestPlaylistPatch(id: string, plst: PlaylistPatch) {
      const originalPlaylists = get().playlists

      // Optimistic update
      set((state) => ({
        playlists: state.playlists.map((p) =>
          p.id === id
            ? {
              ...p,
              ...plst,
            }
            : p,
        ),
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

      // Optimistic update
      set((state) => ({
        playlists: state.playlists.map((p) => {
          if (p.id === playlist_id) {
            const newSettings = {
              ...p.settings,
              ...settings,
              sort_settings: {
                ...p.settings.sort_settings,
                ...(settings.sort_settings || {}),
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
          p.id === playlist_id
            ? get().sortPlaylist({ ...p, settings })
            : p,
        ),
      }))
    },

    /* ---- Playback navigation ---- */
    playNext(pl, reason?: string, forceNextTrack?: Track) {
      const playlistId = typeof pl === 'string' ? pl : pl.id
      const currentPl = get().playlists.find((p) => p.id === playlistId)
      if (!currentPl) return

      const repeatHandler = () => {
        if (currentPl.settings.sort_settings.shuffle !== 'none') {
          const list = currentPl.track_data.filter((t) => t.id !== currentPl.now_playing?.id)
          return list.length > 0 ? list[Math.floor(Math.random() * list.length)] : undefined
        }
        if (currentPl.settings.repeat_mode === 'all') {
          if (
            currentPl.track_data.length > 0 &&
            currentPl.track_data[currentPl.track_data.length - 1].id === currentPl.now_playing?.id
          ) {
            return currentPl.track_data[0]
          } else {
            const idx = currentPl.track_data.findIndex((t) => t.id === currentPl.now_playing?.id)
            return idx !== -1 && idx < currentPl.track_data.length - 1
              ? currentPl.track_data[idx + 1]
              : undefined
          }
        } else {
          if (currentPl.track_data.length > 0) {
            const idx = currentPl.track_data.findIndex((t) => t.id === currentPl.now_playing?.id)
            return idx !== -1 && idx < currentPl.track_data.length - 1
              ? currentPl.track_data[idx + 1]
              : undefined
          }
          return undefined
        }
      }

      set((state) => ({
        playlists: state.playlists.map((p) =>
          p.id === playlistId
            ? {
              ...p,
              history: currentPl.now_playing
                ? [...p.history, currentPl.now_playing].slice(-99)
                : p.history,
            }
            : p,
        ),
      }))

      if (forceNextTrack) {
        get().requestPlayNow(playlistId, forceNextTrack.id)
        return
      }

      let nextTrack = undefined

      if (currentPl.now_playing === undefined) {
        nextTrack = currentPl.track_data[0] || undefined
      } else if (currentPl.settings.mode === 'flow') {
        nextTrack = currentPl.track_data[0] || undefined
        currentPl.now_playing &&
          get().requestRemoveTrack(playlistId, currentPl.now_playing.id, reason)
      } else {
        nextTrack = repeatHandler()
      }

      get().requestPlayNow(playlistId, nextTrack?.id || undefined)
    },

    playPrev(playlistId: string) {
      const pl = get().playlists.find((p) => p.id === playlistId)
      if (!pl || pl.history.length === 0) return

      const newHistory = [...pl.history]
      const prevTrack = newHistory.pop()

      set((state) => ({
        playlists: state.playlists.map((p) =>
          p.id === playlistId
            ? {
              ...p,
              history: newHistory,
            }
            : p,
        ),
      }))

      if (prevTrack) {
        get().requestPlayNow(playlistId, prevTrack.id)
      }
    },

    sortPlaylist(playlist: ClientPlaylist) {
      const { sort_settings } = playlist.settings
      const tracks = [...playlist.track_data]

      // Если shuffle включен — делаем случайную перестановку
      // if (sort_settings.shuffle !== 'none') {
      //   tracks = tracks
      //     .map((t) => ({ t, sort: Math.random() }))
      //     .sort((a, b) => a.sort - b.sort)
      //     .map(({ t }) => t)
      //   return { ...playlist, track_data: tracks }
      // }

      // Сортировка по priority и date

      const sortedTracks = tracks.sort((a, b) => {
        // 1. Уровень: Сортировка по priority (если включена)
        if (sort_settings.priority !== 'none') {
          const valA = a.priority ?? 0
          const valB = b.priority ?? 0

          if (valA !== valB) {
            return sort_settings.priority === 'asc' ? valA - valB : valB - valA
          }
        }

        // 2. Уровень: Сортировка по date (если включена и предыдущий уровень вернул равенство)
        if (sort_settings.date !== 'none') {
          if (a.created_at !== b.created_at) {
            const compareResult = a.created_at.localeCompare(b.created_at)
            return sort_settings.date === 'asc' ? compareResult : -compareResult
          }
        }

        return 0
      })

      return { ...playlist, track_data: sortedTracks }
    },

    /* ---- subscribe management ---- */
    subscribePlaylist(playlistId) {
      // register handler and emit subscribe to server
      registerSocketHandlers(playlistId)
      // flag isSub in playlists
      set((state) => ({
        playlists: state.playlists.map((p) =>
          p.id === playlistId ? { ...p, isSub: true } : p,
        ),
      }))

      const s = get().socket
      if (s !== undefined && s.emit)
        s.emit('subscribe', { playlist_id: playlistId })
    },

    unsubscribePlaylist(playlistId) {
      unregisterSocketHandlers(playlistId)
      set((state) => ({
        playlists: state.playlists.map((p) =>
          p.id === playlistId ? { ...p, isSub: false } : p,
        ),
      }))
      const s = get().socket
      if (s !== undefined && s.emit)
        s.emit('unsubscribe', { playlist_id: playlistId })
    },
  }
})

export default useMusicStore
