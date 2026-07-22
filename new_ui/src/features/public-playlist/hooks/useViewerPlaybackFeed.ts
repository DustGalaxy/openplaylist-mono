// src/features/public-playlist/hooks/useViewerPlaybackFeed.ts
import { useMemo } from 'react'
import { useViewerPlayback } from './useViewerPlayback'
import type { ClientPlaylist } from '@/types/playlist'
import type { PlaybackFeed } from '@/features/player/types'

export function useViewerPlaybackFeed(
  playlist: ClientPlaylist | null,
): PlaybackFeed | null {
  const vp = useViewerPlayback(playlist)

  return useMemo(() => {
    if (!playlist || !vp.currentTrack) return null

    const isFree = vp.mode === 'free'

    return {
      feedId: `viewer:${playlist.id}`,
      nowPlayingTrack: vp.currentTrack,
      playing: vp.isPlaying,
      seekSignal: vp.seekSignal,
      repeatMode: vp.repeatMode,
      capabilities: {
        canSkip: isFree,
        canSeekArbitrary: isFree,
        canRequestSync: vp.canSync,
        canStop: false, // зритель никогда не "останавливает вещание"
      },
      onPlayerStateChange: vp.onPlayerStateChange,
      onEnded: vp.handleEnded,
      registerPositionGetter: vp.registerPositionGetter,
      setRepeatMode: vp.setRepeatMode,
      next: vp.next,
      prev: vp.prev,
      seek: vp.seek, // после правки хука выше
      requestSync: vp.canSync
        ? () => (vp.mode === 'synced' ? vp.desync() : vp.sync())
        : undefined,
    }
  }, [playlist, vp])
}
