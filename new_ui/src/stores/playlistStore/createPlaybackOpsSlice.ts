import { pickNext } from './helpers'
import type { StateCreator } from 'zustand'
import type { PlaybackOpsSlice, StoreState } from '@/types/playlist'
import { postPlayNow } from '@/api/api-playlist'
import { playPlayerTrack } from '@/api/api-player'
import { CLIENT_ID } from '@/lib/clientId'
import { usePlaybackStore } from '@/stores/playbackStore'

export const createPlaybackOpsSlice: StateCreator<
  StoreState,
  [],
  [],
  Pick<StoreState, keyof PlaybackOpsSlice>
> = (set, get) => ({
  playTrack: (trackId, positionSeconds = 0) => {
    const s = get()
    const playlistId = s.slots.player.playlistId
    if (!playlistId) return

    get().setPlayerTrack(trackId)

    if (positionSeconds > 0) {
      get().updateLocal(playlistId, {
        pendingResume: { track_id: trackId, position_seconds: positionSeconds },
      })
    }

    const role = s.getSlotRole('player')
    const playerMode = usePlaybackStore.getState().playerMode
    const activeChannel = usePlaybackStore.getState().activeChannel

    const shouldBroadcast =
      role === 'owner' ||
      ((role === 'operator' || s.canActInSlot('player', 'setNowPlaying')) &&
        playerMode === 'control')

    if (shouldBroadcast) {
      postPlayNow(playlistId, trackId).catch((e) =>
        console.error('[playback] postPlayNow failed', e),
      )

      const targetOwnerId =
        activeChannel?.owner_id || s.cache[playlistId]?.data?.owner_id
      if (targetOwnerId) {
        playPlayerTrack(targetOwnerId, {
          track_id: trackId,
          playlist_id: playlistId,
          position: positionSeconds,
          client_id: CLIENT_ID,
        }).catch((e) => console.error('[player] playPlayerTrack failed', e))
      }
    }
  },

  playNext: (reason) => {
    const s = get()
    const playlistId = s.slots.player.playlistId
    if (!playlistId) return false

    const entry = s.cache[playlistId]
    const pl = entry.data
    if (!pl) return false

    const currentTrackId = s.slots.player.currentTrackId

    if (currentTrackId) {
      get().updateLocal(playlistId, {
        history: [...entry.local.history, currentTrackId].slice(-99),
      })
    }

    const {
      nextTrackId,
      removeCurrentId,
      resumePositionSeconds,
      consumedPausedBackground,
      consumedPausedRegular,
    } = pickNext(pl, currentTrackId ?? undefined, get().cache[playlistId])

    if (removeCurrentId)
      get().removeTrack('player', removeCurrentId, reason ?? 'listened')
    if (consumedPausedBackground)
      get().updateLocal(playlistId, { paused_background: null })
    if (consumedPausedRegular)
      get().updateLocal(playlistId, { paused_regular: null })
    if (nextTrackId) get().playTrack(nextTrackId, resumePositionSeconds ?? 0)

    return !!nextTrackId
  },

  playPrev: () => {
    const s = get()
    const playlistId = s.slots.player.playlistId
    if (!playlistId) return
    const history = s.cache[playlistId].local.history
    if (history.length === 0) return

    const prevId = history[history.length - 1]
    get().updateLocal(playlistId, { history: history.slice(0, -1) })
    get().playTrack(prevId)
  },

  stopPlayback: () => {
    const s = get()
    const playlistId = s.slots.player.playlistId
    if (!playlistId) return
    get().setPlayerTrack(null)
    const role = s.getSlotRole('player')
    const playerMode = usePlaybackStore.getState().playerMode
    const shouldBroadcast =
      role === 'owner' ||
      ((role === 'operator' || s.canActInSlot('player', 'setNowPlaying')) &&
        playerMode === 'control')

    if (shouldBroadcast) {
      postPlayNow(playlistId, undefined).catch((e) =>
        console.error('[playback] postPlayNow(stop) failed', e),
      )
    }
  },

  startPlaylist: async (playlistId) => {
    await get().setSlotPlaylist('player', playlistId)
    const entry = get().cache[playlistId]
    const trackId = entry?.data?.now_playing?.id
    if (trackId) get().playTrack(trackId)
    else get().playNext()
  },

  startTrack: async (playlistId, trackId) => {
    const s = get()
    if (s.slots.player.playlistId !== playlistId) {
      await get().setSlotPlaylist('player', playlistId)
    }
    get().playTrack(trackId)
  },
})
