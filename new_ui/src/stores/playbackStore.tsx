import { create } from 'zustand'

export type PlaybackMode = 'owner' | 'viewer'

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
    // ponytail: no-op guard — клик по уже играющему плейлисту не должен
    // дёргать фиды/ремаунтить Player зря
    if (get().activePlaybackId === id && get().activeMode === mode) return
    set({ activePlaybackId: id, activeMode: mode })
  },

  clearActivePlayback: () => set({ activePlaybackId: null, activeMode: null }),
}))

// селекторы-хелперы — чтобы Sidebar/Player не писали
// `usePlaybackStore((s) => s.activePlaybackId === id)` руками в 10 местах
export const useIsPlaybackActive = (id: string, mode: PlaybackMode) =>
  usePlaybackStore((s) => s.activePlaybackId === id && s.activeMode === mode)
