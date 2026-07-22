import { create } from 'zustand'
import { createPlaylistCacheSlice } from './createPlaylistCacheSlice'
import { createSlotSlice } from './createSlotSlice'
import { createTrackOpsSlice } from './createTrackOpsSlice'
import { createPlaybackOpsSlice } from './createPlaybackOpsSlice'
import { createSyncSlice } from './createSyncSlice'
import { createRoleSlice } from './createRoleSlice'
import { createPlaylistSettingsSlice } from './createPlaylistSettingsSlice'
import type { StoreState } from './types'

export const usePlaylistStore = create<StoreState>()((set, get, ...rest) => ({
  userId: null,
  socket: null,
  setUserId: (userId) => set({ userId }),
  setSocket: (socket) => set({ socket }),
  playerSessionRestored: false,

  setPlayerSessionRestored: () => set({ playerSessionRestored: true }),

  ...createPlaylistCacheSlice(set, get, ...rest),
  ...createSlotSlice(set, get, ...rest),
  ...createTrackOpsSlice(set, get, ...rest),
  ...createRoleSlice(set, get, ...rest),
  ...createPlaylistSettingsSlice(set, get, ...rest),
  ...createPlaybackOpsSlice(set, get, ...rest),
  ...createSyncSlice(set, get, ...rest),
}))
