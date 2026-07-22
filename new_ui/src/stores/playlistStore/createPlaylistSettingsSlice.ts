import { reorderStep, sortByRules } from './helpers'
import type { StateCreator } from 'zustand'
import type { PlaylistSettingsSlice, StoreState } from './types'
import type { ModeSettings, PlaylistSettings } from '@/types/playlist'
import { changePlaylistSettings, patchPlaylist } from '@/api/api-playlist'

async function patchModeSettings(
  get: () => StoreState,
  playlistId: string,
  updater: (current: ModeSettings) => ModeSettings,
): Promise<void> {
  const entry = get().cache[playlistId]
  const pl = entry.data
  const mode = pl.settings.mode
  const originalSettings = pl.settings

  const updatedModeSettings = updater(pl.settings.mode_settings[mode])
  const updatedSettings: PlaylistSettings = {
    ...originalSettings,
    mode_settings: {
      ...originalSettings.mode_settings,
      [mode]: updatedModeSettings,
    },
  }

  get().updatePlaylistData(playlistId, (p) => ({
    ...p,
    settings: updatedSettings,
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

export const createPlaylistSettingsSlice: StateCreator<
  StoreState,
  [],
  [],
  Pick<StoreState, keyof PlaylistSettingsSlice>
> = (set, get) => ({
  patchPlaylistMeta: async (playlistId, patch) => {
    const entry = get().cache[playlistId]
    if (!entry) return
    const original = entry.data

    get().updatePlaylistData(playlistId, (p) => ({ ...p, ...patch }))

    try {
      await patchPlaylist(playlistId, patch)
      // server echoes real state via settings_changed:{id} / playlist update socket event, no manual sync needed here
    } catch (error) {
      console.error('Failed to patch playlist, reverting:', error)
      get().updatePlaylistData(playlistId, () => original)
      throw error
    }
  },

  toggleExternalRequests: async (playlistId, isActive) => {
    await get().patchPlaylistMeta(playlistId, {
      is_allow_external_requests: !isActive,
    })
  },

  reorderTrack: async (slot, group, ids) => {
    const s = get()
    const playlistId = s.slots[slot].playlistId
    if (!playlistId || !s.canActInSlot(slot, 'reorder')) return

    await patchModeSettings(get, playlistId, (current) =>
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
          },
    )
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
    const settingsKey =
      group === 'vip' ? 'sort_settings_vip' : 'sort_settings_regular'
    await patchModeSettings(get, playlistId, (current) => ({
      ...current,
      [settingsKey]: { ...current[settingsKey], ...patch },
    }))
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
