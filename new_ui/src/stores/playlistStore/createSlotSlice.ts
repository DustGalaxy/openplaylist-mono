import type { StateCreator } from 'zustand'
import type { SlotId, SlotState, StoreState } from '@/types/playlist'
import { savePlayerSession } from '@/lib/playerSessionPersistence'

export interface SlotSlice {
  slots: Record<SlotId, SlotState>
  setSlotPlaylist: (slot: SlotId, playlistId: string | null) => void
  setPlayerTrack: (trackId: string | null) => void
  clearSlot: (slot: SlotId) => void
}

export const createSlotSlice: StateCreator<
  StoreState,
  [],
  [],
  Pick<StoreState, keyof SlotSlice>
> = (set, get) => ({
  slots: {
    player: { playlistId: null, currentTrackId: null },
    page: { playlistId: null, currentTrackId: null },
  },

  setSlotPlaylist: (slot, rawPlaylistId) => {
    const playlistId =
      rawPlaylistId &&
      rawPlaylistId !== 'undefined' &&
      rawPlaylistId !== 'null' &&
      rawPlaylistId.trim()
        ? rawPlaylistId.trim()
        : null

    const prev = get().slots[slot].playlistId
    if (prev === playlistId) return

    set((s) => ({
      slots: {
        ...s.slots,
        [slot]: {
          playlistId,
          currentTrackId:
            slot === 'player' ? null : s.slots[slot].currentTrackId,
        },
      },
    }))

    if (prev) get().detachPlaylist(prev)
    if (playlistId) void get().attachPlaylist(playlistId)

    if (slot === 'player' && !playlistId) savePlayerSession(null)
  },

  setPlayerTrack: (trackId) => {
    set((s) => ({
      slots: {
        ...s.slots,
        player: { ...s.slots.player, currentTrackId: trackId },
      },
    }))
    const playlistId = get().slots.player.playlistId
    if (playlistId && trackId) savePlayerSession({ playlistId, trackId })
    else savePlayerSession(null)
  },

  clearSlot: (slot) => get().setSlotPlaylist(slot, null),
})
