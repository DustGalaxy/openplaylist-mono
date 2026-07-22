// src/features/playlist/hooks/useOwnerPlaybackFeed.ts
import { useEffect, useMemo, useRef, useState } from 'react'
import type {
  PlaybackFeed,
  RepeatMode,
  SeekSignal,
} from '@/features/player/types'
import useMusicStore from '@/stores/musicStore'
import { getPlaybackPositionStore } from '@/lib/playbackPosition'

export function useOwnerPlaybackFeed(
  playlistId: string | null,
): PlaybackFeed | null {
  const playlist = useMusicStore((s) =>
    playlistId ? s.playlists.find((p) => p.id === playlistId) : undefined,
  )
  const { playNext, playPrev, requestSeekState } = useMusicStore()

  const [playing, setPlaying] = useState(false)
  const [seekSignal, setSeekSignal] = useState<SeekSignal>(null)
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('none')

  const seekTokenRef = useRef(0)
  const positionGetterRef = useRef<() => number>(() => 0)
  const resumedTrackIdRef = useRef<string | undefined>(undefined)

  const playbackStore = useMemo(
    () =>
      playlist
        ? getPlaybackPositionStore(playlist.settings.sync_playback_position)
        : null,
    [playlist?.settings.sync_playback_position],
  )

  const seek = (seconds: number) => {
    seekTokenRef.current += 1
    setSeekSignal({ position: seconds, token: seekTokenRef.current })
  }

  // резюм 1 раз на трек: paused_background (VIP-прерывание) приоритетнее
  // сохранённой в playbackStore позиции — 1:1 логика из старого handleReady
  useEffect(() => {
    if (
      !playlist?.now_playing ||
      resumedTrackIdRef.current === playlist.now_playing.id
    )
      return
    resumedTrackIdRef.current = playlist.now_playing.id
    console.log('resumedTrackIdRef.current = ', resumedTrackIdRef.current)

    const paused = playlist.paused_background

    console.log('paused = ', paused)
    console.log('paused.track_id = ', paused && paused.track_id)
    console.log('playlist.now_playing.id = ', playlist.now_playing.id)

    if (paused && paused.track_id === playlist.now_playing.id) {
      useMusicStore.getState().clearPausedBackground(playlist.id)
      seek(paused.position)
      return
    }

    if (!playbackStore) return
    playbackStore
      .load(playlist.id)
      .then((saved) => {
        if (saved && saved.track_id === playlist.now_playing?.id)
          seek(saved.position)
      })
      .catch(() => {})
  }, [playlist?.now_playing?.id])

  const savePosition = () => {
    if (!playlist?.now_playing || !playbackStore) return
    playbackStore
      .save(playlist.id, {
        track_id: playlist.now_playing.id,
        position: positionGetterRef.current(),
        updated_at: new Date().toISOString(),
      })
      .catch(() => {})
  }

  useEffect(() => {
    if (!playlist) return
    const heartbeat = window.setInterval(() => {
      if (playing) savePosition()
    }, 10000)
    window.addEventListener('beforeunload', savePosition)
    return () => {
      window.clearInterval(heartbeat)
      window.removeEventListener('beforeunload', savePosition)
      savePosition()
    }
  }, [playlist?.id, playing])

  if (!playlist) return null

  const onEnded = () => {
    // 'once' — локальный replay, не трогает очередь стора вообще
    if (repeatMode === 'once') {
      seek(0)
      setPlaying(true)
      return
    }
    // 'none'/'all' — playNext сам решит, крутить ли по кругу
    // (см. pl.settings.repeat_mode в playbackSlice, static-ветка)
    if (playNext(playlist, 'listened')) setPlaying(true)
  }

  return {
    feedId: `owner:${playlist.id}`,
    nowPlayingTrack: playlist.now_playing,
    playing,
    seekSignal,
    repeatMode,
    capabilities: {
      canSkip: true,
      canSeekArbitrary: true,
      canRequestSync: false,
      canStop: true,
    },
    onPlayerStateChange: (p) => {
      setPlaying(p)
      if (p) savePosition() // как handlePlay в PlayerBase — фиксируем позицию на возобновлении
    },
    onEnded,
    registerPositionGetter: (getter) => {
      positionGetterRef.current = getter
    },
    setRepeatMode,
    next: () => {
      seek(0)
      return playNext(playlist, 'skipped')
    },
    prev: () => {
      seek(0)
      playPrev(playlist.id)
    },
    seek: (seconds) => {
      seek(seconds)
      if (playlist.now_playing && playlist.settings.sync_playback_position) {
        requestSeekState(playlist.id, seconds, playlist.now_playing.id)
      }
    },
    stop: () => {
      setPlaying(false)
      // ponytail: воспроизвожу как было в PlayerBase.handleStop — форсит now_playing=undefined.
      // requestPlayNow(id, undefined) читается лучше, чем { id: undefined } as Track — проверь
      // не сломает ли явный undefined логику pendingPlays/track lookup в trackSlice
      useMusicStore.getState().requestPlayNow(playlist.id, undefined)
    },
  }
}
