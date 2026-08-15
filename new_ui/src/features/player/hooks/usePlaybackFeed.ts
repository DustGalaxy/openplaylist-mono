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
import { CLIENT_ID } from '@/lib/clientId'

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
    patchNow,
  } = usePlaylistStore()

  const [playing, setPlaying] = useState(false)
  const [seekSignal, setSeekSignal] = useState<SeekSignal>(null)
  // const [repeatMode, setRepeatMode] = useState<RepeatMode>('none')
  const seekTokenRef = useRef(0)
  const positionGetterRef = useRef<() => number>(() => 0)
  const resumedTrackIdRef = useRef<string | undefined>(undefined)
  // ponytail: ref mirrors `playing` so the heartbeat interval reads it fresh without being
  // in that effect's deps — kills the whole stale-closure bug class instead of patching it
  const playingRef = useRef(playing)
  playingRef.current = playing

  const sessionRestored = usePlaylistStore((s) => s.playerSessionRestored)

  const shouldBroadcast =
    canControlPlayback && (role === 'owner' || !!local?.isRemoteControlMode)

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
    if (!playlist) return
    const isOwner = role === 'owner'
    const isSyncingViewer = role === 'viewer' && !!local?.acceptSync
    const isRemoteMod = role === 'operator' && !!local?.isRemoteControlMode
    const isSyncingMod = role === 'operator' && !!local?.acceptSync

    if (!isOwner && !isSyncingViewer && !isRemoteMod && !isSyncingMod) return

    const incomingSeek = local?.syncSeek
    if (incomingSeek) {
      if (incomingSeek.client_id !== CLIENT_ID) {
        if (incomingSeek.track_id && incomingSeek.track_id !== currentTrackId)
          playTrack(incomingSeek.track_id)
        seek(incomingSeek.position)
      }
      updateLocal(playlist.id, { syncSeek: null })
    }
    const incomingPause = local?.syncPause
    if (incomingPause) {
      if (incomingPause.client_id !== CLIENT_ID) {
        if (incomingPause.track_id && incomingPause.track_id !== currentTrackId)
          playTrack(incomingPause.track_id)
        seek(incomingPause.position)
        setPlaying(!incomingPause.is_paused)
      }
      updateLocal(playlist.id, { syncPause: null })
    }
  }, [
    local?.syncSeek,
    local?.syncPause,
    role,
    playlist,
    local?.acceptSync,
    local?.isRemoteControlMode,
  ])

  const activeTrackIdRef = useRef(currentTrackId)
  activeTrackIdRef.current = currentTrackId

  const savePositionNow = (trackId: string | undefined, position: number) => {
    if (!playbackStore || !playlistId || !trackId) return
    console.log('savePositionNow = ', playlistId, {
      track_id: trackId,
      position,
      updated_at: new Date().toISOString(),
    })

    playbackStore
      .save(playlistId, {
        track_id: trackId,
        position,
        client_id: CLIENT_ID,
        updated_at: new Date().toISOString(),
      })
      .catch(() => {})
  }

  useEffect(() => {
    if (!playbackStore || !playlistId) return
    const tick = () => {
      console.log('playingRef.current = ', playingRef.current)

      if (playingRef.current) {
        savePositionNow(activeTrackIdRef.current, positionGetterRef.current())
      }
    }
    const heartbeat = window.setInterval(tick, 10000)
    window.addEventListener('beforeunload', tick)
    return () => {
      window.clearInterval(heartbeat)
      window.removeEventListener('beforeunload', tick)
      tick()
    }
  }, [playbackStore, playlistId])

  useEffect(() => {
    const pending = local?.pendingInterrupt
    if (!pending || !playlist) return
    if (pending.fromTrackId !== currentTrackId) return

    if (pending.groupWasInterrupt === 'background')
      updateLocal(playlist.id, {
        pendingInterrupt: null,
        paused_background: {
          track_id: pending.fromTrackId,
          position_seconds: positionGetterRef.current(),
        },
      })
    else if (pending.groupWasInterrupt === 'regular')
      updateLocal(playlist.id, {
        pendingInterrupt: null,
        paused_regular: {
          track_id: pending.fromTrackId,
          position_seconds: positionGetterRef.current(),
        },
      })

    playTrack(pending.toTrackId)
  }, [local?.pendingInterrupt])

  useEffect(() => {
    if (!shouldBroadcast || !nowPlayingTrack || !playlist) return
    const interval = window.setInterval(() => {
      if (playingRef.current)
        postPositionState(
          playlist.id,
          positionGetterRef.current(),
          CLIENT_ID,
        ).catch(() => {})
    }, 5000)
    return () => window.clearInterval(interval)
  }, [shouldBroadcast, nowPlayingTrack?.id, playlist?.id])

  const onEnded = () => {
    savePositionNow(currentTrackId, positionGetterRef.current())
    if (local?.repeatMode !== 'once') {
      if (!playNext('listened')) {
        clearActivePlayback()
        setPlaying(false)
        stopPlayback()
      } else setPlaying(true)
    } else {
      setPlaying(true)
    }
  }

  const setRepeatMode = (repeatMode: RepeatMode) => {
    if (!playlistId) return
    if (role !== 'viewer') {
      patchNow(playlistId, { repeat_mode: repeatMode })
    }
    updateLocal(playlistId, { repeatMode })
  }

  const setShuffle = (shuffle: boolean) => {
    if (!playlistId) return
    updateLocal(playlistId, { shuffle })
  }

  if (!playlist) {
    return {
      feedId: `${slot}:empty`,
      nowPlayingTrack: undefined,
      playing: false,
      seekSignal: null,
      repeatMode: local?.repeatMode || 'none',
      shuffle: local?.shuffle || false,
      capabilities: EMPTY_CAPABILITIES,
      onPlayerStateChange: () => {},
      onEnded: () => {},
      registerPositionGetter: () => {},
      setRepeatMode,
      setShuffle,
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
    repeatMode: local?.repeatMode || 'none',
    shuffle: local?.shuffle || false,
    capabilities: {
      canSkip: true,
      canSeekArbitrary: true,
      canRequestSync: role === 'viewer',
      canStop: canControlPlayback,
    },
    onPlayerStateChange: (p) => {
      if (p === playing) return
      setPlaying(p)
      if ((shouldBroadcast || local?.isRemoteControlMode) && nowPlayingTrack) {
        postPauseState(
          playlist.id,
          !p,
          positionGetterRef.current(),
          nowPlayingTrack.id,
          CLIENT_ID,
        ).catch(() => {})
      }
    },
    onEnded,
    registerPositionGetter: (getter) => {
      positionGetterRef.current = getter
    },
    setRepeatMode,
    setShuffle,
    next: () => {
      savePositionNow(currentTrackId, positionGetterRef.current())
      if (!playNext('skipped')) {
        clearActivePlayback()
        setPlaying(false)
        stopPlayback()
        return false
      }
      seek(0)
      return true
    },
    prev: () => {
      savePositionNow(currentTrackId, positionGetterRef.current())
      seek(0)
      playPrev()
    },
    seek: (seconds) => {
      seek(seconds)
      if ((shouldBroadcast || local?.isRemoteControlMode) && nowPlayingTrack) {
        postSeekState(
          playlist.id,
          seconds,
          nowPlayingTrack.id,
          CLIENT_ID,
        ).catch((e) => console.error('[feed] postSeekState failed', e))
      }
    },
    stop:
      canControlPlayback || local?.isRemoteControlMode
        ? () => {
            if (
              (shouldBroadcast || local?.isRemoteControlMode) &&
              nowPlayingTrack
            ) {
              postPauseState(
                playlist.id,
                true,
                positionGetterRef.current(),
                nowPlayingTrack.id,
                CLIENT_ID,
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
