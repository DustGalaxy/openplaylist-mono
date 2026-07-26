import { resolveNextTrack } from './helpers'
import type { StateCreator } from 'zustand'
import type { PlaybackOpsSlice, StoreState } from '@/types/playlist'
import { postPlayNow } from '@/api/api-playlist'

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

    if (s.canActInSlot('player', 'setNowPlaying')) {
      postPlayNow(playlistId, trackId).catch((e) =>
        console.error('[playback] postPlayNow failed', e),
      )
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
    } = resolveNextTrack(
      pl,
      currentTrackId ?? undefined,
      get().cache[playlistId],
    )

    if (removeCurrentId)
      get().removeTrack('player', removeCurrentId, reason ?? 'listened')
    if (consumedPausedBackground)
      get().updateLocal(playlistId, { paused_background: null })
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
    if (s.canActInSlot('player', 'setNowPlaying')) {
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
