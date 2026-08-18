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
})
