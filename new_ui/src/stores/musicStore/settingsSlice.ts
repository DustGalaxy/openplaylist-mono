/* eslint-disable @typescript-eslint/no-unnecessary-condition */

import type { ModeSettings } from '@/types/playlist'
import { changePlaylistSettings, patchPlaylist } from '@/api/api-playlist'
import { splitQueue } from '@/stores/musicStore/helpers'
import type { GetFn, SetFn, StoreState } from './types'

export function createSettingsSlice(
  set: SetFn,
  get: GetFn,
): Pick<
  StoreState,
  | 'requestPlaylistPatch'
  | 'syncPlaylistPatch'
  | 'requestPlSettings'
  | 'syncPlSettings'
  | 'requestReorder'
  | 'requestReorderStep'
> {
  return {
    async requestPlaylistPatch(id, plst) {
      const originalPlaylists = get().playlists

      set((state) => ({
        playlists: state.playlists.map((p) => (p.id === id ? { ...p, ...plst } : p)),
      }))

      try {
        const response = await patchPlaylist(id, plst)
        get().syncPlaylistPatch(response)
      } catch (error) {
        console.error('Failed to patch playlist, reverting:', error)
        set(() => ({ playlists: originalPlaylists }))
        throw error
      }
    },

    syncPlaylistPatch(plst) {
      set((state) => ({
        playlists: state.playlists.map((p) =>
          p.id === plst.id
            ? {
              ...p,
              name: plst.name,
              description: plst.description,
              is_public: plst.is_public,
              is_favorite: plst.is_favorite,
              is_allow_external_requests: plst.is_allow_external_requests,
              allow_sources: plst.allow_sources,
              tags: plst.tags,
            }
            : p,
        ),
      }))
    },

    async requestPlSettings(playlist_id, settings) {
      const originalPlaylists = get().playlists

      set((state) => ({
        playlists: state.playlists.map((p) => {
          if (p.id === playlist_id) {
            const newSettings = {
              ...p.settings,
              ...settings,
              mode_settings: {
                ...p.settings.mode_settings,
                ...(settings.mode_settings || {}),
              },
            }
            return get().sortPlaylist({ ...p, settings: newSettings })
          }
          return p
        }),
      }))

      try {
        const res = await changePlaylistSettings(playlist_id, settings)
        get().syncPlSettings(playlist_id, res)
      } catch (error) {
        console.error('Failed to change playlist settings, reverting:', error)
        set(() => ({ playlists: originalPlaylists }))
        throw error
      }
    },

    syncPlSettings(playlist_id, settings) {
      set((state) => ({
        playlists: state.playlists.map((p) =>
          p.id === playlist_id ? get().sortPlaylist({ ...p, settings }) : p
        ),
      }))
    },

    async requestReorder(playlistId, mode, group, orderedIds) {
      const pl = get().playlists.find((p) => p.id === playlistId)
      if (!pl) return

      const originalPlaylists = get().playlists

      set((state) => ({
        playlists: state.playlists.map((p) => {
          if (p.id !== playlistId) return p

          const current = p.settings.mode_settings[mode]
          const updatedModeSettings: ModeSettings =
            group === 'background'
              ? { ...current, background_track_ids: orderedIds }
              : {
                ...current,
                ...(group === 'vip'
                  ? { sort_settings_vip: { ...current.sort_settings_vip, manual_order_ids: orderedIds } }
                  : { sort_settings_regular: { ...current.sort_settings_regular, manual_order_ids: orderedIds } }),
              }

          return {
            ...p,
            settings: {
              ...p.settings,
              mode_settings: {
                ...p.settings.mode_settings,
                [mode]: updatedModeSettings,
              },
            },
          }
        }),
      }))

      try {
        const mode_settings = get().playlists.find((p) => p.id === playlistId)?.settings.mode_settings
        get().requestPlSettings(playlistId, {
          mode_settings: mode_settings
        })
      } catch (error) {
        console.error('Failed to reorder tracks, reverting:', error)
        set(() => ({ playlists: originalPlaylists }))
        throw error
      }
    },

    async requestReorderStep(playlistId, group, trackId, dir) {
      const pl = get().playlists.find((p) => p.id === playlistId)
      if (!pl) return

      const mode = pl.settings.mode
      const modeSettings = pl.settings.mode_settings[mode]

      let currentIds: Array<string>


      if (group === 'background') {
        if (mode !== 'stream') {
          console.error('Background group reorder only valid in stream mode')
          return
        }
        currentIds = modeSettings.background_track_ids
      } else {
        const settings = group === 'vip' ? modeSettings.sort_settings_vip : modeSettings.sort_settings_regular
        const { vip, regular } = splitQueue(pl)
        const visibleGroup = group === 'vip' ? vip : regular
        const visibleIds = visibleGroup.map((t) => t.id)
        const visibleIdSet = new Set(visibleIds)

        const reconciled = settings.manual_order_ids.filter((id) => visibleIdSet.has(id))
        const knownIds = new Set(reconciled)
        const newIds = visibleIds.filter((id) => !knownIds.has(id))

        currentIds = settings.manual_order_ids.length > 0
          ? [...reconciled, ...newIds]
          : visibleIds
      }

      const idx = currentIds.indexOf(trackId)
      console.log("currentIds - ", currentIds);
      console.log("idx - ", idx);
      if (idx === -1) return

      const swapWith = dir === 'up' ? idx - 1 : idx + 1
      console.log("swapWith - ", swapWith);
      if (swapWith < 0 || swapWith >= currentIds.length) return



      const next = [...currentIds]
        ;[next[idx], next[swapWith]] = [next[swapWith], next[idx]]
      console.log("next - ", next);
      await get().requestReorder(playlistId, mode, group, next)
    },
  }
}