// src/features/player/hooks/useMediaSession.ts
import { useEffect } from 'react'
import type { PlaybackFeed } from '../types'

export function useMediaSession(feed: PlaybackFeed) {
  const track = feed.nowPlayingTrack

  // Update Media Metadata
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return

    if (track) {
      const thumbnailUrl = track.yt_video_id
        ? `https://img.youtube.com/vi/${track.yt_video_id}/hqdefault.jpg`
        : undefined

      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.from_owner || track.author || 'OpenPlaylist',
        album: 'OpenPlaylist',
        artwork: thumbnailUrl
          ? [
              {
                src: thumbnailUrl,
                sizes: '480x360',
                type: 'image/jpeg',
              },
            ]
          : [],
      })
    } else {
      navigator.mediaSession.metadata = null
    }
  }, [track?.id, track?.title, track?.from_owner, track?.author, track?.yt_video_id])

  // Update Playback State
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return
    navigator.mediaSession.playbackState = feed.playing ? 'playing' : 'paused'
  }, [feed.playing])

  // Register Action Handlers
  useEffect(() => {
    if (typeof window === 'undefined' || !('mediaSession' in navigator)) return

    const setAction = (
      action: MediaSessionAction,
      handler: MediaSessionActionHandler | null,
    ) => {
      try {
        navigator.mediaSession.setActionHandler(action, handler)
      } catch {
        // Some actions may not be supported by all browsers
      }
    }

    setAction('play', () => feed.onPlayerStateChange(true))
    setAction('pause', () => feed.onPlayerStateChange(false))

    if (feed.capabilities.canSkip) {
      setAction('nexttrack', () => feed.next())
      setAction('previoustrack', () => feed.prev())
    } else {
      setAction('nexttrack', null)
      setAction('previoustrack', null)
    }

    if (feed.capabilities.canStop && feed.stop) {
      setAction('stop', () => feed.stop?.())
    } else {
      setAction('stop', null)
    }

    if (feed.capabilities.canSeekArbitrary) {
      setAction('seekto', (details) => {
        if (details.seekTime !== undefined && Number.isFinite(details.seekTime)) {
          feed.seek(details.seekTime)
        }
      })
    } else {
      setAction('seekto', null)
    }

    return () => {
      setAction('play', null)
      setAction('pause', null)
      setAction('nexttrack', null)
      setAction('previoustrack', null)
      setAction('stop', null)
      setAction('seekto', null)
    }
  }, [
    feed.onPlayerStateChange,
    feed.capabilities.canSkip,
    feed.capabilities.canStop,
    feed.capabilities.canSeekArbitrary,
    feed.next,
    feed.prev,
    feed.stop,
    feed.seek,
  ])
}
