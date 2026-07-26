// src/features/player/hooks/usePlaybackFeed.ts
import { useEffect, useMemo, useRef, useState } from 'react'
import type {
  PlaybackFeed,
  RepeatMode,
  SeekSignal,
} from '@/features/player/types'
import type { SlotId } from '@/types/playlist'
import { usePlaylistStore } from '@/stores/playlistStore'
import { getPlaybackPositionStore } from '@/lib/playbackPosition'
import {
  getPlaybackState,
  postPauseState,
  postPositionState,
  postSeekState,
} from '@/api/api-playlist'
import { usePlaybackStore } from '@/stores/playbackStore'

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

  const nowPlayingTrack = useMemo(
    () => playlist?.track_data.find((track) => track.id === currentTrackId),
    [playlist?.track_data, currentTrackId],
  )

  const local = usePlaylistStore((s) =>
    playlistId ? s.cache[playlistId]?.local : undefined,
  )
  const role = usePlaylistStore((s) => s.getSlotRole(slot))
  const { setActivePlayback, clearActivePlayback } = usePlaybackStore()
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
  // ponytail: ref mirrors `playing` so the heartbeat interval reads it fresh without being
  // in that effect's deps — kills the whole stale-closure bug class instead of patching it
  const playingRef = useRef(playing)
  playingRef.current = playing

  const sessionRestored = usePlaylistStore((s) => s.playerSessionRestored)

  // show_in_widget is a broadcast too (OBS widget), independent of the viewer-sync toggle
  const shouldBroadcast =
    canControlPlayback &&
    !!(playlist?.sync_playback_position || playlist?.show_in_widget)

  const useBackendPositionStore =
    role !== 'viewer' && !!playlist?.sync_playback_position

  const playbackStore = useMemo(
    () => (playlist ? getPlaybackPositionStore(useBackendPositionStore) : null),
    [playlist?.id, useBackendPositionStore],
  )

  const seek = (seconds: number) => {
    seekTokenRef.current += 1
    setSeekSignal({ position: seconds, token: seekTokenRef.current })
  }

  useEffect(() => {
    if (!sessionRestored || !nowPlayingTrack) return
    setPlaying(true)
  }, [nowPlayingTrack?.id, sessionRestored])

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

    setActivePlayback(playlist!.id, role === 'viewer' ? 'viewer' : 'owner')

    if (!playbackStore) return
    playbackStore
      .load(playlist!.id)
      .then((saved) => {
        if (saved && saved.track_id === nowPlayingTrack.id) seek(saved.position)
      })
      .catch(() => {})
  }, [nowPlayingTrack?.id])

  useEffect(() => {
    if (role !== 'viewer' || !local?.acceptSync || !playlist) return
    const incomingSeek = local.syncSeek
    if (incomingSeek) {
      if (incomingSeek.track_id !== currentTrackId)
        playTrack(incomingSeek.track_id)
      seek(incomingSeek.position)
      updateLocal(playlist.id, { syncSeek: null })
    }
    const incomingPause = local.syncPause
    if (incomingPause) {
      if (incomingPause.track_id !== currentTrackId)
        playTrack(incomingPause.track_id)
      seek(incomingPause.position)
      setPlaying(!incomingPause.is_paused)
      updateLocal(playlist.id, { syncPause: null })
    }
  }, [local?.syncSeek, local?.syncPause, role])

  // ponytail: single source of truth is store.getState(), read fresh on every tick/unmount —
  // nothing closed over, so no dependency array can ever go stale
  useEffect(() => {
    if (!playbackStore || !playlistId) return

    const savePosition = () => {
      const trackId = usePlaylistStore.getState().slots[slot].currentTrackId
      if (!trackId) return
      playbackStore
        .save(playlistId, {
          track_id: trackId,
          position: positionGetterRef.current(),
          updated_at: new Date().toISOString(),
        })
        .catch(() => {})
    }

    const heartbeat = window.setInterval(() => {
      if (playingRef.current) savePosition()
    }, 10000)
    window.addEventListener('beforeunload', savePosition)
    return () => {
      window.clearInterval(heartbeat)
      window.removeEventListener('beforeunload', savePosition)
      savePosition()
    }
  }, [playbackStore, playlistId, slot])

  useEffect(() => {
    const pending = local?.pendingInterrupt
    if (!pending || !playlist) return
    if (pending.fromTrackId !== currentTrackId) return
    updateLocal(playlist.id, {
      pendingInterrupt: null,
      paused_background: {
        track_id: pending.fromTrackId,
        position_seconds: positionGetterRef.current(),
      },
    })
    playTrack(pending.toTrackId)
  }, [local?.pendingInterrupt])

  useEffect(() => {
    if (!shouldBroadcast || !nowPlayingTrack || !playlist) return
    const interval = window.setInterval(() => {
      postPositionState(playlist.id, positionGetterRef.current()).catch(
        () => {},
      )
    }, 5000)
    return () => window.clearInterval(interval)
  }, [shouldBroadcast, nowPlayingTrack?.id, playlist?.id])

  const onEnded = () => {
    if (repeatMode === 'once') {
      seek(0)
      setPlaying(true)
      return
    }
    playNext('listened')
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
      if (shouldBroadcast && nowPlayingTrack) {
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
      if (shouldBroadcast && nowPlayingTrack) {
        postSeekState(playlist.id, seconds, nowPlayingTrack.id).catch((e) =>
          console.error('[feed] postSeekState failed', e),
        )
      }
    },
    stop: canControlPlayback
      ? () => {
          if (shouldBroadcast && nowPlayingTrack) {
            postPauseState(
              playlist.id,
              true,
              positionGetterRef.current(),
              nowPlayingTrack.id,
            ).catch(() => {})
          }
          clearActivePlayback()
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
