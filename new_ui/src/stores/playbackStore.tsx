import { create } from 'zustand'
import type { ActiveChannel, PlayerMode, PlayerState } from '@/types/player'
import type { ModeratedChannelResponse } from '@/types/moderator'
import type { UserProfile } from '@/types/user'
import { useAuthStore } from '@/stores/authStore'
import { fetchPlayerState } from '@/api/api-player'
import { safeEmit } from '@/lib/socketUtils'

export type PlaybackMode = 'owner' | 'viewer' | 'single'

export const createUserChannel = (user: {
  id: string
  username?: string
  nickname?: string
}): ActiveChannel => ({
  owner_id: user.id,
  name: user.username || user.nickname || 'Мой канал',
  is_owner: true,
  can_control_player: true,
  can_manage_all_playlists: true,
})

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
  syncUserChannel: (user: UserProfile | null) => void
  setModeratedChannels: (channels: ModeratedChannelResponse[]) => void
  setBroadcastToWidget: (enabled: boolean) => void
  setPlayerState: (state: PlayerState | null) => void
}

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
    let resolvedChannel = channel
    if (!resolvedChannel) {
      const user = useAuthStore.getState().user
      if (user) {
        resolvedChannel = createUserChannel(user)
      }
    }

    const prevOwnerId = get().activeChannel?.owner_id
    const newOwnerId = resolvedChannel?.owner_id

    set({ activeChannel: resolvedChannel })

    if (prevOwnerId === newOwnerId && get().playerState) {
      return
    }

    void import('@/stores/playlistStore')
      .then(async ({ usePlaylistStore }) => {
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
        } else {
          set({ playerState: null })
        }
      })
      .catch((err) =>
        console.error('[playbackStore] playlistStore import failed:', err),
      )
  },

  syncUserChannel: (user) => {
    if (!user) {
      const prevOwnerId = get().activeChannel?.owner_id
      set({
        activeChannel: null,
        playerState: null,
        moderatedChannels: [],
      })
      if (prevOwnerId) {
        void import('@/stores/playlistStore').then(({ usePlaylistStore }) => {
          const socket = usePlaylistStore.getState().socket
          if (socket) {
            safeEmit(socket, 'player_unsubscribe', { owner_id: prevOwnerId })
          }
        })
      }
      return
    }

    const currentChannel = get().activeChannel
    if (!currentChannel || currentChannel.is_owner) {
      const userChannel = createUserChannel(user)
      get().setActiveChannel(userChannel)
    }
  },

  setModeratedChannels: (channels) => set({ moderatedChannels: channels }),
  setBroadcastToWidget: (enabled) => set({ broadcastToWidget: enabled }),
  setPlayerState: (state) => set({ playerState: state }),
}))

export const useIsPlaybackActive = (id: string, mode: PlaybackMode) =>
  usePlaybackStore((s) => s.activePlaybackId === id && s.activeMode === mode)

