import { reorderStep, sortByRules } from './helpers'
import type { StateCreator } from 'zustand'
import type {
  ModeSettings,
  Playlist,
  PlaylistSettingsSlice,
  StoreState,
} from '@/types/playlist'
import { changePlaylistSettings, patchPlaylist } from '@/api/api-playlist'

async function patchModeSettings(
  get: () => StoreState,
  playlistId: string,
  updater: (current: ModeSettings) => ModeSettings,
): Promise<void> {
  const entry = get().cache[playlistId]
  const pl = entry.data
  const mode = pl.mode
  const originalSettings = pl

  const updatedModeSettings = updater(pl.mode_settings[mode])
  const updatedSettings: Playlist = {
    ...originalSettings,
    mode_settings: {
      ...originalSettings.mode_settings,
      [mode]: updatedModeSettings,
    },
  }

  get().updatePlaylistData(playlistId, (p) => ({
    ...p,
    ...updatedSettings,
  }))

  try {
    await changePlaylistSettings(playlistId, {
      mode_settings: updatedSettings.mode_settings,
    })
  } catch (error) {
    console.error('Failed to update playlist settings, reverting:', error)
    get().updatePlaylistData(playlistId, (p) => ({
      ...p,
      settings: originalSettings,
    }))
    throw error
  }
}

const pendingPatches: Record<string, Partial<Playlist>> = {}
const patchTimers: Record<string, ReturnType<typeof setTimeout>> = {}
const DEBOUNCE_MS = 1500

function flushPatch(get: () => StoreState, playlistId: string) {
  const patch = pendingPatches[playlistId]
  delete pendingPatches[playlistId]
  delete patchTimers[playlistId]
  if (!patch) return
  patchPlaylist(playlistId, patch).catch((e) => {
    console.error('[settings] debounced patch failed', playlistId, e)
    // no auto-revert — see reasoning below
  })
}

export function schedulePatchSettings(
  get: () => StoreState,
  playlistId: string,
  patch: Partial<Playlist>,
) {
  get().updatePlaylistData(playlistId, (p) => ({ ...p, ...patch }))
  pendingPatches[playlistId] = { ...pendingPatches[playlistId], ...patch }
  if (patchTimers[playlistId]) clearTimeout(patchTimers[playlistId])
  patchTimers[playlistId] = setTimeout(
    () => flushPatch(get, playlistId),
    DEBOUNCE_MS,
  )
}

// per-item debounce (chat role priority, donation rule fields, content settings numbers) —
// keyed independently so editing role A doesn't reset the timer for role B
const itemTimers: Record<string, ReturnType<typeof setTimeout>> = {}
export function scheduleItemPatch(
  key: string,
  fn: () => Promise<any>,
  delay = 2000,
) {
  if (itemTimers[key]) clearTimeout(itemTimers[key])
  itemTimers[key] = setTimeout(() => {
    delete itemTimers[key]
    fn().catch((e) => console.error('[settings] item patch failed', key, e))
  }, delay)
}

export const createPlaylistSettingsSlice: StateCreator<
  StoreState,
  [],
  [],
  Pick<StoreState, keyof PlaylistSettingsSlice>
> = (set, get) => ({
  patchNow: async (playlistId, patch) => {
    const entry = get().cache[playlistId]
    if (!entry) return
    const original = entry.data

    get().updatePlaylistData(playlistId, (p) => ({ ...p, ...patch }))

    try {
      await patchPlaylist(playlistId, patch)
    } catch (error) {
      console.error('[settings] patchNow failed, reverting:', error)
      get().updatePlaylistData(playlistId, () => original)
      throw error
    }
  },

  // fire-and-forget with debounce — use for rapid-fire input (typing, sliders, repeated clicks).
  // Cache updates instantly on every call; the network call is coalesced and delayed.
  // No revert on failure: a hard rollback here could clobber edits made after this patch was
  // scheduled — correctness is repaired by the next settings_changed socket echo.
  patchDebounced: (playlistId, patch) => {
    get().updatePlaylistData(playlistId, (p) => ({ ...p, ...patch }))

    pendingPatches[playlistId] = { ...pendingPatches[playlistId], ...patch }
    if (patchTimers[playlistId]) clearTimeout(patchTimers[playlistId])
    patchTimers[playlistId] = setTimeout(
      () => flushPatch(get, playlistId),
      DEBOUNCE_MS,
    )
  },

  toggleExternalRequests: async (playlistId, isActive) => {
    await get().patchNow(playlistId, {
      is_allow_external_requests: !isActive,
    })
  },

  reorderTrack: async (slot, group, ids) => {
    const s = get()
    const playlistId = s.slots[slot].playlistId

    if (!playlistId || !s.canActInSlot(slot, 'reorder')) return
    const mode = s.cache[playlistId].data.mode
    const settings = s.cache[playlistId].data.mode_settings
    const current = settings[mode]

    const new_settings =
      group === 'background'
        ? { ...current, background_track_ids: ids }
        : {
            ...current,
            ...(group === 'vip'
              ? {
                  sort_settings_vip: {
                    ...current.sort_settings_vip,
                    manual_order_ids: ids,
                  },
                }
              : {
                  sort_settings_regular: {
                    ...current.sort_settings_regular,
                    manual_order_ids: ids,
                  },
                }),
          }
    await get().patchNow(playlistId, {
      mode_settings: { ...settings, [mode]: new_settings },
    })
  },

  reorderStepTrack: async (slot, group, trackId, dir) => {
    const s = get()
    const playlistId = s.slots[slot].playlistId
    if (!playlistId || !s.canActInSlot(slot, 'reorder')) return
    const entry = s.cache[playlistId]
    const newIds = reorderStep(entry.data, trackId, group, dir)
    if (!newIds) return
    await get().reorderTrack(slot, group, newIds)
  },
  setSort: async (slot, group, patch) => {
    const s = get()
    const playlistId = s.slots[slot].playlistId
    if (!playlistId) return
    const role = s.getSlotRole(slot)

    if (role === 'viewer') {
      const entry = s.cache[playlistId]
      get().updateLocal(playlistId, {
        sortOverride: { ...entry.local.sortOverride, ...patch },
      })
      return
    }

    if (!s.canActInSlot(slot, 'setSort')) return

    const pl = s.cache[playlistId].data
    const mode = pl.mode
    const settings = pl.mode_settings
    const current = settings[mode]
    const settingsKey =
      group === 'vip' ? 'sort_settings_vip' : 'sort_settings_regular'

    const new_settings = {
      ...current,
      [settingsKey]: { ...current[settingsKey], ...patch },
    }

    await get().patchNow(playlistId, {
      mode_settings: { ...settings, [mode]: new_settings },
    })
  },

  reorderLocalTrack: (slot, ids) => {
    const s = get()
    const playlistId = s.slots[slot].playlistId
    if (!playlistId) return
    const entry = s.cache[playlistId]
    const existingOutsideThisGroup =
      entry.local.sortOverride.manual_order_ids.filter(
        (id) => !ids.includes(id),
      )
    get().updateLocal(playlistId, {
      sortOverride: {
        ...entry.local.sortOverride,
        order_mode: 'free',
        manual_order_ids: [...existingOutsideThisGroup, ...ids],
      },
    })
  },

  reorderLocalStepTrack: (slot, trackId, dir) => {
    const s = get()
    const playlistId = s.slots[slot].playlistId
    if (!playlistId) return
    const entry = s.cache[playlistId]
    // reuse reorderStep helper against a synthetic "local" playlist view sorted by current override
    const flatIds = sortByRules(
      entry.data.track_data,
      entry.local.sortOverride,
    ).map((t) => t.id)
    const idx = flatIds.indexOf(trackId)
    if (idx === -1) return
    const swapWith = dir === 'up' ? idx - 1 : idx + 1
    if (swapWith < 0 || swapWith >= flatIds.length) return
    const next = [...flatIds]
    ;[next[idx], next[swapWith]] = [next[swapWith], next[idx]]
    get().reorderLocalTrack(slot, next)
  },
})
