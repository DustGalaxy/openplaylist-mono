import { v4 as uuidv4 } from 'uuid'

import { useAuthStore } from '../authStore'
import type { StateCreator } from 'zustand'
import type {
  DeleteStatus,
  Order,
  SlotId,
  StoreState,
  TrackInput,
} from '@/types/playlist'
import { addTrackToPlaylist, removeTrackFromPlaylist } from '@/api/api-playlist'

export interface TrackOpsSlice {
  addTrack: (slot: SlotId, track: TrackInput) => Promise<void>
  removeTrack: (
    slot: SlotId,
    trackId: string,
    reason: DeleteStatus,
  ) => Promise<void>
}

export const createTrackOpsSlice: StateCreator<
  StoreState,
  [],
  [],
  Pick<StoreState, keyof TrackOpsSlice>
> = (set, get) => ({
  addTrack: async (slot, input) => {
    const s = get()
    const playlistId = s.slots[slot].playlistId
    if (!playlistId || !s.canActInSlot(slot, 'add')) return

    const { user } = useAuthStore.getState()
    if (!user) return

    const entry = s.cache[playlistId]
    const role = s.getSlotRole(slot)

    const order: Order = {
      request_id: uuidv4(),
      owner_id: entry.data.owner_id,
      owner_platform_id: entry.data.owner_id,
      requester_id: user.id,
      requester_nickname: user.username,
      playlist_id: playlistId,
      yt_video_url: input.yt_video_url,
      priority: input.priority
        ? input.priority
        : role === 'owner' || role === 'operator'
          ? 'playlist_owner'
          : '',
      source: 'web',
    }

    await addTrackToPlaylist(order)
  },

  removeTrack: async (slot, trackId, reason) => {
    const s = get()
    const playlistId = s.slots[slot].playlistId
    if (!playlistId || !s.canActInSlot(slot, 'remove')) return
    await removeTrackFromPlaylist(playlistId, trackId, reason)
  },
})
