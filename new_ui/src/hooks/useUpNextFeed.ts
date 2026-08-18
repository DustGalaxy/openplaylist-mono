import { useMemo } from 'react'
import type { Track } from '@/types/playlist'
import { usePlaylistStore } from '@/stores/playlistStore'

export function useUpNextFeed(playlistId?: string | null, currentTrackId?: string | null, limit: number = 3): Track[] {
  const playlist = usePlaylistStore((s) => (playlistId ? s.cache[playlistId]?.data : undefined))

  return useMemo(() => {
    if (!playlist || !playlist.track_data || playlist.track_data.length === 0) {
      return []
    }

    const tracks = playlist.track_data
    if (!currentTrackId) {
      return tracks.slice(0, limit)
    }

    const currentIndex = tracks.findIndex((t) => t.id === currentTrackId)
    if (currentIndex === -1) {
      return tracks.slice(0, limit)
    }

    const mode = playlist.mode
    // For flow or stream: tracks after current index
    const nextTracks: Track[] = []
    for (let i = currentIndex + 1; i < tracks.length && nextTracks.length < limit; i++) {
      nextTracks.push(tracks[i])
    }

    // If repeat is active or static mode and we need more tracks, wrap around
    if (nextTracks.length < limit && (playlist.repeat_mode === 'all' || mode === 'static')) {
      for (let i = 0; i < currentIndex && nextTracks.length < limit; i++) {
        nextTracks.push(tracks[i])
      }
    }

    return nextTracks
  }, [playlist, currentTrackId, limit])
}
