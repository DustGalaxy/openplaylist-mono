import type { StateCreator } from 'zustand'
import type { StoreState, SyncSlice } from '@/types/playlist'

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
    // actual heartbeat interval lives in usePlaybackFeed (needs positionGetterRef, a DOM-bound
    // value the store shouldn't hold) — this flag is what that hook's effect watches
  },

  setAcceptSync: (playlistId, accept) => {
    get().updateLocal(playlistId, { acceptSync: accept })
  },
})
