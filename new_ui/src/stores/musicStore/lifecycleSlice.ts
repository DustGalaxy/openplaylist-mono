/* eslint-disable @typescript-eslint/no-unnecessary-condition */

import type { ClientPlaylist } from '@/types/playlist'
import { computePriority } from '@/lib/utils'
import { splitQueue } from '@/stores/musicStore/helpers'
import type { GetFn, SetFn, StoreState } from './types'

export function createLifecycleSlice(
  set: SetFn,
  get: GetFn,
): Pick<
  StoreState,
  | 'input'
  | 'playlists'
  | 'api'
  | 'setApi'
  | 'setPlaylist'
  | 'addPlaylist'
  | 'deletePlaylist'
  | 'setPlaylistsFromServer'
  | 'sortPlaylist'
> {
  return {
    playlists: [],
    input: [],
    api: {},

    setApi(api) {
      set(() => ({ api }))
    },

    setPlaylist(pls: ClientPlaylist) {
      const sorted = get().sortPlaylist(pls)
      set(() => ({
        playlists: get().playlists.map((p) => (p.id === pls.id ? sorted : p)),
      }))
    },

    addPlaylist(pls: ClientPlaylist) {
      set((state) => ({
        playlists: [
          ...state.playlists,
          { ...pls, paused_background: pls.paused_background ?? null, is_paused: pls.is_paused ?? true },
        ],
      }))
      get().subscribePlaylist(pls.id)
    },

    deletePlaylist(playlistId: string) {
      get().unsubscribePlaylist(playlistId)
      const pls = get().playlists.filter((p) => p.id !== playlistId)
      set(() => ({ playlists: pls }))
    },

    setPlaylistsFromServer(pls) {
      const existing = get().playlists
      const pl = pls.map((p) =>
        get().sortPlaylist({
          ...p,
          isSub: false,
          history: [],
          now_playing: p.track_data
            .filter((t) => t.id === p.now_playing)
            .map((t) => ({
              ...t,
              priority: computePriority(t, p.settings),
            }))[0],
          track_data: p.track_data.map((t) => ({
            ...t,
            priority: computePriority(t, p.settings),
          })),
          settings: {
            ...p.settings,
          },
          paused_background: existing.find((e) => e.id === p.id)?.paused_background ?? null,
          is_paused: existing.find((e) => e.id === p.id)?.is_paused ?? true,
        }),
      )
      set(() => ({ playlists: pl }))
    },

    sortPlaylist(playlist) {
      const { vip, regular, background } = splitQueue(playlist)
      return { ...playlist, track_data: [...vip, ...regular, ...background] }
    },
  }
}