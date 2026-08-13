import type { StateCreator } from 'zustand'
import type { StoreState, SyncSlice } from '@/types/playlist'
import { safeEmit } from './helpers'

export const createSyncSlice: StateCreator<
  StoreState,
  [],
  [],
  Pick<StoreState, keyof SyncSlice>
> = (set, get) => ({
  toggleBroadcast: (playlistId, enabled) => {
    const s = get()
    if (!s.canActInSlot('player', 'broadcast')) return
    get().patchNow(playlistId, { sync_playback_position: enabled })
  },

  setAcceptSync: (playlistId, accept) => {
    get().updateLocal(playlistId, { acceptSync: accept })
  },

  setRemoteControlMode: async (playlistId, enabled) => {
    get().updateLocal(playlistId, { isRemoteControlMode: enabled })
    if (enabled) {
      const socket = get().socket
      if (socket) {
        safeEmit(socket, 'playback_subscribe', { playlist_id: playlistId })
      }
      if (get().slots?.player?.playlistId !== playlistId) {
        if (get().setSlotPlaylist) {
          await get().setSlotPlaylist('player', playlistId)
        }
      }
      const entry = get().cache?.[playlistId]
      const nowPlayingId = entry?.data?.now_playing?.id
      if (nowPlayingId && get().setPlayerTrack) {
        get().setPlayerTrack(nowPlayingId)
      }
      try {
        const { getPlaybackState } = await import('@/api/api-playlist')
        const state = await getPlaybackState(playlistId)
        if (state) {
          const trackId = state.track_id || nowPlayingId
          if (trackId && get().setPlayerTrack) get().setPlayerTrack(trackId)
          const position = Number(state.position ?? 0)
          const isPaused =
            state.is_paused === 'true' ||
            state.is_paused === 'True' ||
            state.is_paused === '1'
          get().updateLocal(playlistId, {
            syncPause: {
              is_paused: isPaused,
              position,
              track_id: trackId || '',
            },
            syncSeek: { position, track_id: trackId || '' },
          })
        }
      } catch (e) {
        console.error('[sync] getPlaybackState failed', e)
      }
    }
  },
})
