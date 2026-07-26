import type { StateCreator } from 'zustand'
import type {
  Playlist,
  PlaylistRole,
  SlotId,
  StoreState,
  TrackAction,
} from '@/types/playlist'

export interface RoleSlice {
  getRole: (
    playlist: Playlist | undefined,
    userId: string | null,
  ) => PlaylistRole
  getSlotRole: (slot: SlotId) => PlaylistRole
  canAct: (
    action: TrackAction,
    role: PlaylistRole,
    playlist: Playlist,
  ) => boolean
  canActInSlot: (slot: SlotId, action: TrackAction) => boolean
}

const PERMISSIONS: Record<TrackAction, Array<PlaylistRole>> = {
  add: ['owner', 'operator', 'viewer'],
  remove: ['owner', 'operator'],
  reorder: ['owner', 'operator'],
  setSort: ['owner', 'operator', 'viewer'], // viewer writes local.sortOverride only, gated in trackOps
  setNowPlaying: ['owner', 'operator'],
  seek: ['owner', 'operator'],
  broadcast: ['owner'],
}

export const createRoleSlice: StateCreator<
  StoreState,
  [],
  [],
  Pick<StoreState, keyof RoleSlice>
> = (set, get) => ({
  getRole: (playlist, userId) => {
    if (!playlist || !userId) return 'viewer'
    if (playlist.owner_id === userId) return 'owner'
    // ponytail: operator_ids not yet in InputPlaylist — stub until backend contract lands
    return 'viewer'
  },

  getSlotRole: (slot) => {
    const s = get()
    const playlistId = s.slots[slot].playlistId
    const playlist = playlistId ? s.cache[playlistId]?.data : undefined
    return s.getRole(playlist, s.userId)
  },

  canAct: (action, role, playlist) => {
    if (!PERMISSIONS[action].includes(role)) return false
    if (
      action === 'add' &&
      role === 'viewer' &&
      !playlist.is_allow_external_requests
    )
      return false
    return true
  },

  canActInSlot: (slot, action) => {
    const s = get()
    const playlistId = s.slots[slot].playlistId
    const entry = playlistId ? s.cache[playlistId] : undefined
    if (!entry?.data) return false
    return s.canAct(action, s.getSlotRole(slot), entry.data)
  },
})
