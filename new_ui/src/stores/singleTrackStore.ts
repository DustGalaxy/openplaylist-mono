import { create } from 'zustand'
import { usePlaybackStore } from './playbackStore'
import type { PlaybackMode } from './playbackStore'

export interface SingleTrackItem {
  yt_video_id: string
  title: string
  duration?: number
  author?: string
}

export interface SavedSnapshot {
  playlistId: string
  mode: 'owner' | 'viewer'
  trackId?: string | null
  position: number
  wasPlaying: boolean
}

export type RepeatMode = 'none' | 'once'

interface SingleTrackStore {
  activeSingleTrack: SingleTrackItem | null
  isPlaying: boolean
  seekSignal: { position: number; token: number } | null
  repeatMode: RepeatMode
  savedSnapshot: SavedSnapshot | null

  playSingleTrack: (
    track: SingleTrackItem,
    context?: {
      playlistId?: string | null
      mode?: PlaybackMode | null
      currentTrackId?: string | null
      currentPosition?: number
      wasPlaying?: boolean
    },
  ) => void

  stopSingleTrack: () => void
  setPlaying: (playing: boolean) => void
  seek: (seconds: number) => void
  setRepeatMode: (mode: RepeatMode) => void
  toggleRepeatMode: () => void
}

export const useSingleTrackStore = create<SingleTrackStore>((set, get) => ({
  activeSingleTrack: null,
  isPlaying: false,
  seekSignal: null,
  repeatMode: 'none',
  savedSnapshot: null,

  playSingleTrack: (track, context) => {
    const currentActiveMode = usePlaybackStore.getState().activeMode
    const currentActiveId = usePlaybackStore.getState().activePlaybackId

    let snapshot = get().savedSnapshot

    // Only capture new snapshot if we are not already in single track mode
    if (
      currentActiveMode &&
      currentActiveMode !== 'single' &&
      currentActiveId
    ) {
      snapshot = {
        playlistId: context?.playlistId || currentActiveId,
        mode: (context?.mode as 'owner' | 'viewer') || currentActiveMode,
        trackId: context?.currentTrackId ?? null,
        position: context?.currentPosition ?? 0,
        wasPlaying: context?.wasPlaying ?? true,
      }
    }

    set({
      activeSingleTrack: track,
      isPlaying: true,
      seekSignal: null,
      savedSnapshot: snapshot,
    })

    usePlaybackStore.getState().setActivePlayback('single-preview', 'single')
  },

  stopSingleTrack: () => {
    const snapshot = get().savedSnapshot

    set({
      activeSingleTrack: null,
      isPlaying: false,
      seekSignal: null,
      savedSnapshot: null,
    })

    if (snapshot?.playlistId && snapshot.mode) {
      usePlaybackStore
        .getState()
        .setActivePlayback(snapshot.playlistId, snapshot.mode)
    } else {
      usePlaybackStore.getState().clearActivePlayback()
    }
  },

  setPlaying: (playing) => set({ isPlaying: playing }),

  seek: (seconds) =>
    set((state) => ({
      seekSignal: {
        position: seconds,
        token: (state.seekSignal?.token ?? 0) + 1,
      },
    })),

  setRepeatMode: (mode) => set({ repeatMode: mode }),

  toggleRepeatMode: () =>
    set((state) => ({
      repeatMode: state.repeatMode === 'none' ? 'once' : 'none',
    })),
}))
