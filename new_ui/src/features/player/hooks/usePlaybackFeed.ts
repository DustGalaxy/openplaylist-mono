// src/features/player/hooks/usePlaybackFeed.ts
import { useEffect, useMemo, useRef, useState } from 'react'
import type {
  PlaybackFeed,
  RepeatMode,
  SeekSignal,
} from '@/features/player/types'
import type { SlotId } from '@/stores/playlistStore/types'
import { usePlaylistStore } from '@/stores/playlistStore'
import { getPlaybackPositionStore } from '@/lib/playbackPosition'
import {
  getPlaybackState,
  postPauseState,
  postPositionState,
  postSeekState,
} from '@/api/api-playlist'

const EMPTY_CAPABILITIES = {
  canSkip: false,
  canSeekArbitrary: false,
  canRequestSync: false,
  canStop: false,
}

export function usePlaybackFeed(slot: SlotId = 'player'): PlaybackFeed {
  const playlistId = usePlaylistStore((s) => s.slots[slot].playlistId)
  const playlist = usePlaylistStore((s) =>
    playlistId ? s.cache[playlistId]?.data : undefined,
  )
  const currentTrackId = usePlaylistStore((s) => s.slots[slot].currentTrackId)
  const nowPlayingTrack = playlist?.track_data.find(
    (t) => t.id === currentTrackId,
  )
  const local = usePlaylistStore((s) =>
    playlistId ? s.cache[playlistId]?.local : undefined,
  )
  const role = usePlaylistStore((s) => s.getSlotRole(slot))
  const canControlPlayback = usePlaylistStore((s) =>
    s.canActInSlot(slot, 'setNowPlaying'),
  )
  const {
    playNext,
    playPrev,
    playTrack,
    stopPlayback,
    updateLocal,
    setAcceptSync,
  } = usePlaylistStore()

  const [playing, setPlaying] = useState(false)
  const [seekSignal, setSeekSignal] = useState<SeekSignal>(null)
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('none')

  const seekTokenRef = useRef(0)
  const positionGetterRef = useRef<() => number>(() => 0)
  const resumedTrackIdRef = useRef<string | undefined>(undefined)
  const isFirstRenderRef = useRef(true)

  // reload-resume: viewer always local, owner/operator follow playlist setting (viewer only locally, per memory)
  const useBackendPositionStore =
    role !== 'viewer' && !!playlist?.settings.sync_playback_position
  const playbackStore = useMemo(
    () => (playlist ? getPlaybackPositionStore(useBackendPositionStore) : null),
    [playlist?.id, useBackendPositionStore],
  )

  const seek = (seconds: number) => {
    seekTokenRef.current += 1
    setSeekSignal({ position: seconds, token: seekTokenRef.current })
  }

  // autoplay whenever the local track changes (click, next/prev, auto-advance) —
  // the sync-consume effect below runs after this one and can override with an explicit paused=true
  const sessionRestored = usePlaylistStore((s) => s.playerSessionRestored)

  useEffect(() => {
    if (!sessionRestored || !nowPlayingTrack) return
    setPlaying(true)
  }, [nowPlayingTrack?.id, sessionRestored])

  // resume once per track: pendingResume (VIP-interrupt, set by playNext) takes priority over
  // reload-resume from playbackStore
  useEffect(() => {
    if (!nowPlayingTrack || resumedTrackIdRef.current === nowPlayingTrack.id)
      return
    resumedTrackIdRef.current = nowPlayingTrack.id

    const pending = local?.pendingResume
    if (pending && pending.track_id === nowPlayingTrack.id) {
      updateLocal(playlist!.id, { pendingResume: null })
      seek(pending.position_seconds)
      return
    }

    if (!playbackStore) return
    playbackStore
      .load(playlist!.id)
      .then((saved) => {
        if (saved && saved.track_id === nowPlayingTrack.id) seek(saved.position)
      })
      .catch(() => {})
  }, [nowPlayingTrack?.id])

  // viewer sync consume: apply incoming owner broadcast (seek/pause), only if opted in.
  // Declared after the autoplay effect so an explicit incoming pause=true wins over the generic autoplay default.
  useEffect(() => {
    if (role !== 'viewer' || !local?.acceptSync || !playlist) return

    const incomingSeek = local.syncSeek
    if (incomingSeek) {
      console.log(incomingSeek)
      if (incomingSeek.track_id !== currentTrackId)
        playTrack(incomingSeek.track_id)
      seek(incomingSeek.position)
      updateLocal(playlist.id, { syncSeek: null })
    }
    const incomingPause = local.syncPause
    if (incomingPause) {
      console.log(incomingPause)
      if (incomingPause.track_id !== currentTrackId)
        playTrack(incomingPause.track_id)
      seek(incomingPause.position)
      setPlaying(!incomingPause.is_paused)
      updateLocal(playlist.id, { syncPause: null })
    }
  }, [local?.syncSeek, local?.syncPause, role])

  const savePosition = () => {
    if (!nowPlayingTrack || !playbackStore) return
    playbackStore
      .save(playlist!.id, {
        track_id: nowPlayingTrack.id,
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

  // owner broadcast heartbeat: sends current position periodically while broadcasting is on,
  // independent of reload-resume savePosition above — this is the sync-consumer's data source
  useEffect(() => {
    if (
      !local?.broadcasting ||
      !nowPlayingTrack ||
      !canControlPlayback ||
      !playlist
    )
      return
    const interval = window.setInterval(() => {
      postPositionState(playlist.id, positionGetterRef.current()).catch(
        () => {},
      )
    }, 5000)
    return () => window.clearInterval(interval)
  }, [
    local?.broadcasting,
    nowPlayingTrack?.id,
    canControlPlayback,
    playlist?.id,
  ])

  const onEnded = () => {
    if (repeatMode === 'once') {
      seek(0)
      setPlaying(true)
      return
    }
    playNext('listened')
    // autoplay effect above handles setPlaying(true) once nowPlayingTrack changes
  }

  if (!playlist) {
    return {
      feedId: `${slot}:empty`,
      nowPlayingTrack: undefined,
      playing: false,
      seekSignal: null,
      repeatMode,
      capabilities: EMPTY_CAPABILITIES,
      onPlayerStateChange: () => {},
      onEnded: () => {},
      registerPositionGetter: () => {},
      setRepeatMode,
      next: () => false,
      prev: () => {},
      seek: () => {},
    }
  }

  return {
    feedId: `${slot}:${playlist.id}`,
    nowPlayingTrack,
    playing,
    seekSignal,
    repeatMode,
    capabilities: {
      canSkip: true,
      canSeekArbitrary: true,
      canRequestSync: role === 'viewer',
      canStop: canControlPlayback,
    },
    onPlayerStateChange: (p) => {
      if (p === playing) return
      setPlaying(p)
      if (p) savePosition()
      if (local?.broadcasting && canControlPlayback && nowPlayingTrack) {
        postPauseState(
          playlist.id,
          !p,
          positionGetterRef.current(),
          nowPlayingTrack.id,
        ).catch(() => {})
      }
    },
    onEnded,
    registerPositionGetter: (getter) => {
      positionGetterRef.current = getter
    },
    setRepeatMode,
    next: () => {
      seek(0)
      return playNext('skipped')
    },
    prev: () => {
      seek(0)
      playPrev()
    },
    seek: (seconds) => {
      seek(seconds)
      if (canControlPlayback && local?.broadcasting && nowPlayingTrack) {
        postSeekState(playlist.id, seconds, nowPlayingTrack.id).catch((e) =>
          console.error('[feed] postSeekState failed', e),
        )
      }
    },
    stop: canControlPlayback
      ? () => {
          if (local?.broadcasting && nowPlayingTrack) {
            postPauseState(
              playlist.id,
              true,
              positionGetterRef.current(),
              nowPlayingTrack.id,
            ).catch(() => {})
          }
          setPlaying(false)
          stopPlayback()
        }
      : undefined,
    requestSync:
      role === 'viewer'
        ? async () => {
            setAcceptSync(playlist.id, true)
            const state = await getPlaybackState(playlist.id)
            if (!state) return
            const trackId = state.track_id
            const position = Number(state.position ?? 0)
            const paused = state.is_paused === 'true'

            if (trackId && trackId !== currentTrackId) playTrack(trackId)
            seek(position)
            setPlaying(!paused)
          }
        : undefined,
  }
}
