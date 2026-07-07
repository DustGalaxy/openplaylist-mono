/* eslint-disable @typescript-eslint/no-unnecessary-condition */

import type { PlayNow, Track } from '@/types/playlist'
import { useAuthStore } from '../authStore'
import { safeEmit } from './helpers'
import type { GetFn, SetFn, StoreState } from './types'

export function createSocketSlice(
  set: SetFn,
  get: GetFn,
): Pick<
  StoreState,
  'socket' | 'socketHandlers' | 'setSocket' | 'subscribePlaylist' | 'unsubscribePlaylist'
> {
  function registerSocketHandlers(playlistId: string) {
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

    const pauseStateHandler = (payload: any) => {
      if (!payload) return
      const parsed = typeof payload === 'string' ? JSON.parse(payload) : payload
      if (typeof parsed.is_paused !== 'boolean') return
      set((state) => ({
        playlists: state.playlists.map((p) =>
          p.id === playlistId ? { ...p, is_paused: parsed.is_paused } : p,
        ),
      }))
    }

    const seekStateHandler = (payload: any) => { }

    s.on('add_track:' + playlistId, addHandler)
    s.on('playnow:' + playlistId, playNowHandler)
    s.on('delete_track:' + playlistId, removedHandler)
    s.on('settings_changed:' + playlistId, settingsChangedHandler)
    s.on('playback_pause:' + playlistId, pauseStateHandler)
    s.on('playback_seek:' + playlistId, seekStateHandler)
    s.on('connect', () => safeEmit(s, 'subscribe', { playlist_id: playlistId }))
    s.on('disconnect', () => safeEmit(s, 'unsubscribe', { playlist_id: playlistId }))

    set((st) => ({
      socketHandlers: {
        ...st.socketHandlers,
        [playlistId]: {
          addHandler,
          playNowHandler,
          removedHandler,
          settingsChangedHandler,
          pauseStateHandler,
          seekStateHandler,
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
    if (h.pauseStateHandler) s.off('playback_pause:' + playlistId, h.pauseStateHandler)
    if (h.seekStateHandler) s.off('playback_seek:' + playlistId, h.seekStateHandler)

    const newHandlers = { ...handlers }
    delete newHandlers[playlistId]
    set(() => ({ socketHandlers: newHandlers }))
  }

  return {
    socket: undefined,
    socketHandlers: {},

    setSocket(s) {
      if (s === get().socket) return
      set(() => ({ socket: s }))
      if (s) {
        get().playlists.forEach((plst) => get().subscribePlaylist(plst.id))
      }
    },

    subscribePlaylist(playlistId) {
      registerSocketHandlers(playlistId)
      set((state) => ({
        playlists: state.playlists.map((p) => (p.id === playlistId ? { ...p, isSub: true } : p)),
      }))
      safeEmit(get().socket, 'subscribe', { playlist_id: playlistId })
    },

    unsubscribePlaylist(playlistId) {
      unregisterSocketHandlers(playlistId)
      set((state) => ({
        playlists: state.playlists.map((p) => (p.id === playlistId ? { ...p, isSub: false } : p)),
      }))
      safeEmit(get().socket, 'unsubscribe', { playlist_id: playlistId })
    },
  }
}