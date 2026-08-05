import { create } from 'zustand'

export type PlaybackMode = 'owner' | 'viewer' | 'single'

type PlaybackStore = {
  activePlaybackId: string | null
  activeMode: PlaybackMode | null

  setActivePlayback: (id: string, mode: PlaybackMode) => void
  clearActivePlayback: () => void
}

export const usePlaybackStore = create<PlaybackStore>((set, get) => ({
  activePlaybackId: null,
  activeMode: null,

  setActivePlayback: (id, mode) => {
    if (get().activePlaybackId === id && get().activeMode === mode) return
    set({ activePlaybackId: id, activeMode: mode })
  },

  clearActivePlayback: () => set({ activePlaybackId: null, activeMode: null }),
}))

export const useIsPlaybackActive = (id: string, mode: PlaybackMode) =>
  usePlaybackStore((s) => s.activePlaybackId === id && s.activeMode === mode)
