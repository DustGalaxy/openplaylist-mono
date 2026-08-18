import { create } from 'zustand'
import type { ActiveChannel, PlayerMode, PlayerState } from '@/types/player'
import type { ModeratedChannelResponse } from '@/types/moderator'

export type PlaybackMode = 'owner' | 'viewer' | 'single'

interface PlaybackStore {
  // Legacy / slot support
  activePlaybackId: string | null
  activeMode: PlaybackMode | null
  setActivePlayback: (id: string, mode: PlaybackMode) => void
  clearActivePlayback: () => void

  // UserPlayer 1:1 state
  playerMode: PlayerMode
  activeChannel: ActiveChannel | null
  moderatedChannels: ModeratedChannelResponse[]
  broadcastToWidget: boolean
  playerState: PlayerState | null

  setPlayerMode: (mode: PlayerMode) => void
  setActiveChannel: (channel: ActiveChannel | null) => void
  setModeratedChannels: (channels: ModeratedChannelResponse[]) => void
  setBroadcastToWidget: (enabled: boolean) => void
  setPlayerState: (state: PlayerState | null) => void
}

import { fetchPlayerState } from '@/api/api-player'
import { safeEmit } from '@/lib/socketUtils'

export const usePlaybackStore = create<PlaybackStore>((set, get) => ({
  activePlaybackId: null,
  activeMode: null,

  setActivePlayback: (id, mode) => {
    if (get().activePlaybackId === id && get().activeMode === mode) return
    set({ activePlaybackId: id, activeMode: mode })
  },

  clearActivePlayback: () => set({ activePlaybackId: null, activeMode: null }),

  playerMode: 'listen',
  activeChannel: null,
  moderatedChannels: [],
  broadcastToWidget: true,
  playerState: null,

  setPlayerMode: (mode) => set({ playerMode: mode }),

  setActiveChannel: (channel) => {
    set({ activeChannel: channel })

    void import('@/stores/playlistStore')
      .then(async ({ usePlaylistStore }) => {
        const userId = usePlaylistStore.getState().userId
        const prevOwnerId = get().activeChannel?.owner_id || userId
        const newOwnerId = channel?.owner_id || userId
        const socket = usePlaylistStore.getState().socket

        if (socket && prevOwnerId && prevOwnerId !== newOwnerId) {
          safeEmit(socket, 'player_unsubscribe', { owner_id: prevOwnerId })
        }

        if (newOwnerId) {
          if (socket) {
            safeEmit(socket, 'player_subscribe', { owner_id: newOwnerId })
          }

          try {
            const state = await fetchPlayerState(newOwnerId)
            if (state) {
              set({
                playerState: state,
                broadcastToWidget: state.broadcast_to_widget,
              })
              if (state.active_playlist_id) {
                await usePlaylistStore
                  .getState()
                  .setSlotPlaylist('player', state.active_playlist_id)
              }
              if (state.current_track_id) {
                usePlaylistStore.getState().setPlayerTrack(state.current_track_id)
              }
            } else {
              set({ playerState: null })
            }
          } catch (err) {
            console.error('[playbackStore] fetchPlayerState failed:', err)
          }
        }
      })
      .catch((err) =>
        console.error('[playbackStore] playlistStore import failed:', err),
      )
  },

  setModeratedChannels: (channels) => set({ moderatedChannels: channels }),
  setBroadcastToWidget: (enabled) => set({ broadcastToWidget: enabled }),
  setPlayerState: (state) => set({ playerState: state }),
}))

export const useIsPlaybackActive = (id: string, mode: PlaybackMode) =>
  usePlaybackStore((s) => s.activePlaybackId === id && s.activeMode === mode)
