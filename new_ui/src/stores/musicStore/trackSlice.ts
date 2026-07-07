/* eslint-disable @typescript-eslint/no-unnecessary-condition */

import { v4 as uuidv4 } from 'uuid'
import type { Order } from '@/types/playlist'
import { addTrackToPlaylist, removeTrackFromPlaylist } from '@/api/api-playlist'
import { computePriority } from '@/lib/utils'
import { getActiveModeSettings, isVipTrack } from '@/stores/musicStore/helpers'
import { useAuthStore } from '../authStore'
import type { GetFn, SetFn, StoreState } from './types'

export function createTrackSlice(
  set: SetFn,
  get: GetFn,
): Pick<
  StoreState,
  'pendingAdds' | 'pendingRemoves' | 'requestAddTrack' | 'syncAddTrack' | 'requestRemoveTrack' | 'syncRemoveTrack'
> {
  return {
    pendingAdds: {},
    pendingRemoves: {},

    async requestAddTrack(playlistId, yt_video_url, ownerId?) {
      const { user } = useAuthStore.getState()
      const owner_id = get().playlists.find((p) => p.id === playlistId)?.owner_id ?? ownerId
      if (!user || !owner_id) return
      const order: Order = {
        request_id: uuidv4(),
        owner_id: owner_id,
        owner_platform_id: user.id,
        requester_id: user.id,
        requester_nickname: user.username,
        playlist_id: playlistId,
        yt_video_url: yt_video_url,
        priority: 'bms',
        source: 'web',
      }

      const addTrackFn = get().api.addTrack || addTrackToPlaylist
      await addTrackFn(order)
    },

    syncAddTrack(playlistId, track) {
      const pl = get().playlists.find((p) => p.id === playlistId)
      if (!pl) return

      const newTrack = {
        ...track,
        priority: computePriority(track, pl.settings),
      }

      const updatedPl = get().sortPlaylist({
        ...pl,
        track_data: [...pl.track_data, newTrack],
      })

      set((state) => ({
        playlists: state.playlists.map((p) => (p.id === playlistId ? updatedPl : p)),
      }))

      const modeSettings = getActiveModeSettings(updatedPl)
      const nowPlaying = updatedPl.now_playing
      const newTrackIsVip = isVipTrack(newTrack, modeSettings)
      const currentlyPlayingIsVip = nowPlaying !== undefined && isVipTrack(nowPlaying, modeSettings)

      // Премиум-трек не прерывает уже играющий премиум (см. гайд: "премиум
      // треки не прерывают друг друга, а просто встают в очередь") — поэтому
      // прерывание срабатывает только когда сейчас играет НЕ vip.
      if (
        newTrackIsVip &&
        nowPlaying !== undefined &&
        !currentlyPlayingIsVip &&
        !updatedPl.paused_background
      ) {
        const position = get().getPlayerPosition?.() ?? 0
        set((state) => ({
          playlists: state.playlists.map((p) =>
            p.id === playlistId
              ? {
                ...p,
                paused_background: {
                  track_id: nowPlaying.id,
                  position: position,
                },
              }
              : p,
          ),
        }))
        get().requestPlayNow(playlistId, newTrack.id)
      }
    },

    async requestRemoveTrack(playlistId, orderId, reason) {
      set((state) => {
        const pending = { ...state.pendingRemoves }
        if (!pending[playlistId]) pending[playlistId] = new Set()
        const newSet = new Set(pending[playlistId])
        newSet.add(orderId)
        pending[playlistId] = newSet
        return { pendingRemoves: pending }
      })

      const originalPlaylists = get().playlists

      set((state) => ({
        playlists: state.playlists.map((p) =>
          p.id === playlistId
            ? get().sortPlaylist({
              ...p,
              track_data: p.track_data.filter((t) => t.id !== orderId),
            })
            : p,
        ),
      }))

      try {
        const removeFn = get().api.removeTrack || removeTrackFromPlaylist
        await removeFn(playlistId, orderId, reason)
      } catch (error) {
        console.error('Failed to request remove track, reverting:', error)
        set((state) => {
          const pending = { ...state.pendingRemoves }
          if (pending[playlistId]) {
            const newSet = new Set(pending[playlistId])
            newSet.delete(orderId)
            pending[playlistId] = newSet
          }
          return {
            pendingRemoves: pending,
            playlists: originalPlaylists,
          }
        })
        throw error
      }
    },

    syncRemoveTrack(playlistId, orderId) {
      const pl = get().playlists.find((p) => p.id === playlistId)
      if (!pl) return

      const pending = get().pendingRemoves[playlistId]
      const wasPending = pending && pending.has(orderId)

      if (wasPending) {
        set((state) => {
          const pendingRemoves = { ...state.pendingRemoves }
          if (pendingRemoves[playlistId]) {
            const newSet = new Set(pendingRemoves[playlistId])
            newSet.delete(orderId)
            pendingRemoves[playlistId] = newSet
          }
          return { pendingRemoves }
        })
      } else {
        set((state) => ({
          playlists: state.playlists.map((p) =>
            p.id === playlistId
              ? get().sortPlaylist({
                ...p,
                track_data: p.track_data.filter((t) => t.id !== orderId),
              })
              : p,
          ),
        }))
      }

      const freshPl = get().playlists.find((p) => p.id === playlistId)
      if (!freshPl) return

      const { user } = useAuthStore.getState()
      const isOwner = user && user.id === freshPl.owner_id

      if (freshPl.now_playing?.id === orderId && isOwner) {
        get().playNext(freshPl, 'removed')
      }
    },
  }
}