import { v4 as uuidv4 } from 'uuid'

import { useAuthStore } from '../authStore'
import type { StateCreator } from 'zustand'
import type { Order, StoreState, TrackOpsSlice } from '@/types/playlist'
import {
  addTrackToPlaylist,
  bulkRemoveTracksFromPlaylist,
  removeTrackFromPlaylist,
} from '@/api/api-playlist'

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
    const entry = s.cache[playlistId]
    const role = s.getSlotRole(slot)

    const order: Order = {
      request_id: uuidv4(),
      owner_id: entry.data.owner_id,
      owner_platform_id: entry.data.owner_id,
      requester_id: user ? user.id : role === 'operator' ? `mod_${playlistId}` : 'guest',
      requester_nickname: user
        ? user.username
        : role === 'operator'
          ? 'Moderator'
          : 'Guest',
      playlist_id: playlistId,
      yt_video_url: input.yt_video_url,
      priority: input.priority
        ? input.priority
        : role === 'owner' || role === 'operator'
          ? 'playlist_owner'
          : '',
      source: 'web',
      start_from_target: input.start_from_target,
    }

    await addTrackToPlaylist(order)
  },

  removeTrack: async (slot, trackId, reason) => {
    const s = get()
    const playlistId = s.slots[slot].playlistId
    if (!playlistId || !s.canActInSlot(slot, 'remove')) return
    await removeTrackFromPlaylist(playlistId, trackId, reason)
  },

  removeTracks: async (slot, trackIds, reason) => {
    const s = get()
    const playlistId = s.slots[slot].playlistId
    if (!playlistId || !s.canActInSlot(slot, 'remove') || trackIds.length === 0)
      return
    await bulkRemoveTracksFromPlaylist(playlistId, trackIds, reason)
  },

  updateTrackNote: (playlistId, trackId, note, isPublic = true) => {
    get().updatePlaylistData(playlistId, (pl) => ({
      ...pl,
      track_data: pl.track_data.map((t) =>
        t.id === trackId ? { ...t, note, is_note_public: isPublic } : t,
      ),
    }))
  },
})
