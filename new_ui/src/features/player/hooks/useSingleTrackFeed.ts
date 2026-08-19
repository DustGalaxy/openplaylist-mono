import { useMemo, useRef } from 'react'
import type { PlaybackFeed, RepeatMode } from '../types'
import type { Track } from '@/types/playlist'
import { useSingleTrackStore } from '@/stores/singleTrackStore'

export function useSingleTrackFeed(): PlaybackFeed {
  const activeSingleTrack = useSingleTrackStore((s) => s.activeSingleTrack)
  const isPlaying = useSingleTrackStore((s) => s.isPlaying)
  const seekSignal = useSingleTrackStore((s) => s.seekSignal)
  const storeRepeatMode = useSingleTrackStore((s) => s.repeatMode)
  const setPlaying = useSingleTrackStore((s) => s.setPlaying)
  const seek = useSingleTrackStore((s) => s.seek)
  const toggleRepeatMode = useSingleTrackStore((s) => s.toggleRepeatMode)
  const stopSingleTrack = useSingleTrackStore((s) => s.stopSingleTrack)

  const positionGetterRef = useRef<() => number>(() => 0)

  const nowPlayingTrack: Track | undefined = useMemo(() => {
    if (!activeSingleTrack) return undefined
    return {
      id: activeSingleTrack.yt_video_id,
      yt_video_id: activeSingleTrack.yt_video_id,
      title: activeSingleTrack.title,
      duration: activeSingleTrack.duration ?? 0,
      author: activeSingleTrack.author || '[Unknown author]',
      source: 'web',
      from_owner: false,
      priority: 0,
      is_regular: true,
      created_at: new Date().toISOString(),
    }
  }, [activeSingleTrack])

  const feedRepeatMode: RepeatMode =
    storeRepeatMode === 'once' ? 'once' : 'none'

  return {
    feedId: 'single',
    nowPlayingTrack,
    playing: isPlaying,
    seekSignal,
    repeatMode: feedRepeatMode,
    shuffle: false,
    capabilities: {
      canSkip: true,
      canSeekArbitrary: true,
      canRequestSync: false,
      canStop: true,
    },

    onPlayerStateChange: (playing: boolean) => {
      setPlaying(playing)
    },

    onEnded: () => {
      if (storeRepeatMode === 'once') {
        seek(0)
        setPlaying(true)
      } else {
        stopSingleTrack()
      }
    },

    registerPositionGetter: (getter: () => number) => {
      positionGetterRef.current = getter
    },

    setRepeatMode: () => {
      toggleRepeatMode()
    },

    setShuffle: () => {},

    next: () => {
      stopSingleTrack()
      return true
    },

    prev: () => {
      stopSingleTrack()
    },

    seek: (seconds: number) => {
      seek(seconds)
    },

    stop: () => {
      stopSingleTrack()
    },
  }
}
