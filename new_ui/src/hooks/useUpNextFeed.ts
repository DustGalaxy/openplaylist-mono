import { useMemo } from 'react'
import { DEFAULT_SORT, type Track } from '@/types/playlist'
import { usePlaylistStore } from '@/stores/playlistStore'
import { getActiveModeSettings, sortByRules, splitQueue } from '@/stores/playlistStore/helpers'

export function useUpNextFeed(
  playlistId?: string | null,
  currentTrackId?: string | null,
  limit: number = 3,
): Track[] {
  const playlist = usePlaylistStore((s) =>
    playlistId ? s.cache[playlistId]?.data : undefined,
  )

  return useMemo(() => {
    if (!playlist || !playlist.track_data || playlist.track_data.length === 0) {
      return []
    }

    let orderedTracks: Track[] = []

    try {
      const modeSettings = getActiveModeSettings(playlist)
      if (modeSettings) {
        const { vip, regular, background } = splitQueue(playlist)
        orderedTracks = [
          ...vip,
          ...regular,
          ...(String(playlist.mode).toLowerCase() === 'stream' ? background : []),
        ]
      } else {
        orderedTracks = sortByRules(playlist.track_data, DEFAULT_SORT)
      }
    } catch {
      orderedTracks = playlist.track_data
    }

    if (orderedTracks.length === 0) {
      return []
    }

    if (!currentTrackId) {
      return orderedTracks.slice(0, limit)
    }

    const currentIndex = orderedTracks.findIndex((t) => t.id === currentTrackId)
    if (currentIndex === -1) {
      return orderedTracks.slice(0, limit)
    }

    const mode = String(playlist.mode).toLowerCase()
    const nextTracks: Track[] = []
    for (
      let i = currentIndex + 1;
      i < orderedTracks.length && nextTracks.length < limit;
      i++
    ) {
      nextTracks.push(orderedTracks[i])
    }

    // If repeat is active or static/stream mode and we need more tracks, wrap around
    if (
      nextTracks.length < limit &&
      (playlist.repeat_mode === 'all' || mode === 'static' || mode === 'stream')
    ) {
      for (
        let i = 0;
        i < currentIndex && nextTracks.length < limit;
        i++
      ) {
        nextTracks.push(orderedTracks[i])
      }
    }

    return nextTracks
  }, [playlist, currentTrackId, limit])
}
