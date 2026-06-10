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
    pl: ClientPlaylist,
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

    s.on('add_track:' + playlistId, addHandler)
    s.on('playnow:' + playlistId, playNowHandler)
    s.on('delete_track:' + playlistId, removedHandler)
    s.on('settings_changed:' + playlistId, settingsChangedHandler)
    s.on('connect', () => {
      console.debug('socket connect - re-subscribing to playlist', playlistId)
      if (s !== undefined && s.emit)
        s.emit('subscribe', { playlist_id: playlistId })
    })
    s.on('disconnect', () => {
      console.debug(
        'socket disconnect - unsubscribing from playlist',
        playlistId,
      )
      if (s !== undefined && s.emit)
        s.emit('unsubscribe', { playlist_id: playlistId })
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
    if (h.settingsChangedHandler)
      s.off('settings_changed:' + playlistId, h.settingsChangedHandler)

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
    async requestAddTrack(playlistId, yt_video_url, ownerId = null) {
      // optimistic: add to playlist
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

      await addTrackToPlaylist(order)
    },

    // server sync (socket handler должен вызвать это)
    syncAddTrack(playlistId, track) {
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
    async requestPlayNow(playlistId, track_id) {
      await postPlayNow(playlistId, track_id)
      console.debug('requestPlayNow')
    },

    // called by socket when server broadcasts playnow
    syncPlayNow(playlistId, track) {
      const pl = get().playlists.find((p) => p.id === playlistId)
      if (!pl) return

      const prevNowPlaying =
        pl.settings.mode === 'flow' ? pl.now_playing : undefined
      console.debug('syncPlayNow')

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
    },

    /* ---- REMOVE flow ---- */
    async requestRemoveTrack(playlistId, orderId, reason?: string) {
      console.debug(
        'requestRemoveTrack, playlistId - ',
        playlistId,
        'orderId - ',
        orderId,
      )
      await removeTrackFromPlaylist(playlistId, orderId, reason)
    },

    syncRemoveTrack(playlistId, orderId) {
      console.debug('syncRemoveTrack')
      console.debug(' get().playlists', get().playlists)
      const pl = get().playlists.find((p) => p.id === playlistId)
      if (!pl) return
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

      if (pl.now_playing?.id === orderId) {
        get().playNext(pl, 'removed')
      }
    },

    async requestPlaylistPatch(id: string, plst: PlaylistPatch) {
      const response = await patchPlaylist(id, plst)
      get().syncPlaylistPatch(response)
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
      const res = await changePlaylistSettings(playlist_id, settings)
      get().syncPlSettings(playlist_id, res)
    },

    syncPlSettings(playlist_id, settings) {
      const pl = get().playlists.find((p) => p.id === playlist_id)

      if (!pl) return
      set((state) => ({
        playlists: state.playlists.map((p) =>
          p.id === playlist_id ? { ...p, settings } : p,
        ),
      }))
    },

    /* ---- Playback navigation ---- */
    playNext(pl, reason?: string, forceNextTrack?: Track) {
      const repeatHandler = () => {
        if (pl.settings.sort_settings.shuffle !== 'none') {
          const list = pl.track_data.filter((t) => t.id !== pl.now_playing?.id)
          return list[Math.floor(Math.random() * list.length)]
        }
        if (pl.settings.repeat_mode === 'all') {
          if (
            pl.track_data[pl.track_data.length - 1].id === pl.now_playing?.id
          ) {
            return pl.track_data[0]
          } else {
            return pl.track_data[
              pl.track_data.findIndex((t) => t.id === pl.now_playing?.id) + 1
            ]
          }
        } else {
          return pl.track_data.length > 0
            ? pl.track_data[pl.track_data.length - 1].id === pl.now_playing?.id
              ? undefined
              : pl.track_data[
                  pl.track_data.findIndex((t) => t.id === pl.now_playing?.id) +
                    1
                ]
            : undefined
        }
      }

      set((state) => ({
        playlists: state.playlists.map((p) =>
          p.id === pl.id
            ? {
                ...p,
                history: pl.now_playing
                  ? [...p.history, pl.now_playing].slice(-99)
                  : p.history,
              }
            : p,
        ),
      }))

      if (forceNextTrack) {
        get().requestPlayNow(pl.id, forceNextTrack.id)
        return
      }

      let nextTrack = undefined

      if (pl.now_playing === undefined) {
        nextTrack = pl.track_data[0] || undefined
      } else if (pl.settings.mode === 'flow') {
        nextTrack = pl.track_data[0] || undefined
        pl.now_playing &&
          get().requestRemoveTrack(pl.id, pl.now_playing.id, reason)
      } else {
        nextTrack = repeatHandler()
      }

      get().requestPlayNow(pl.id, nextTrack?.id || undefined)
    },

    playPrev(playlistId: string) {
      const pl = get().playlists.find((p) => p.id === playlistId)
      if (!pl) return

      const track = pl.history.pop()
      console.log('playPrev, track from history', track)

      if (!track) return
      get().requestPlayNow(pl.id, track.id || undefined)
    },

    sortPlaylist(playlist: ClientPlaylist) {
      const { sort_settings } = playlist.settings
      let tracks = [...playlist.track_data]

      // Если shuffle включен — делаем случайную перестановку
      // if (sort_settings.shuffle !== 'none') {
      //   tracks = tracks
      //     .map((t) => ({ t, sort: Math.random() }))
      //     .sort((a, b) => a.sort - b.sort)
      //     .map(({ t }) => t)
      //   return { ...playlist, track_data: tracks }
      // }

      // Сортировка по priority и date
      const sortedTracks = [...tracks].sort((a, b) => {
        // Сначала priority
        if (sort_settings.priority !== 'none' && a.priority !== b.priority) {
          return sort_settings.priority === 'asc'
            ? a.priority - b.priority
            : b.priority - a.priority
        }

        // Потом created_at (дата создания)
        if (sort_settings.date !== 'none' && a.created_at !== b.created_at) {
          const dateA = new Date(a.created_at).getTime()
          const dateB = new Date(b.created_at).getTime()
          return sort_settings.date === 'asc' ? dateA - dateB : dateB - dateA
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
