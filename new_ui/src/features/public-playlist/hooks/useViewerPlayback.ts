import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ClientPlaylist, SocketLike, Track } from '@/types/playlist'
import { getPlaybackState } from '@/api/api-playlist'
import { getPlsUpdsSocket } from '@/api/io-sockets'
import { splitQueue } from '@/stores/musicStore/helpers'

const DRIFT_THRESHOLD_SEC = 3

const DEFAULT_SORT: SortSettings = {
  order_mode: 'host',
  date: 'desc',
  priority: 'none',
  manual_order_ids: [],
}

function sortTracks(tracks: Array<Track>, s: SortSettings): Array<Track> {
  if (s.order_mode === 'free') {
    const order = new Map(s.manual_order_ids.map((id, i) => [id, i]))
    return [...tracks].sort((a, b) => {
      const ia = order.get(a.id)
      const ib = order.get(b.id)
      if (ia !== undefined && ib !== undefined) return ia - ib
      if (ia !== undefined) return -1
      if (ib !== undefined) return 1
      return a.created_at.localeCompare(b.created_at)
    })
  }
  if (s.order_mode === 'random') {
    return [...tracks].sort((a, b) => a.created_at.localeCompare(b.created_at))
  }
  return [...tracks].sort((a, b) => {
    if (s.priority !== 'none') {
      const pa = typeof a.priority === 'number' ? a.priority : 0
      const pb = typeof b.priority === 'number' ? b.priority : 0
      if (pa !== pb) return s.priority === 'asc' ? pa - pb : pb - pa
    }
    if (s.date !== 'none' && a.created_at !== b.created_at) {
      const cmp = a.created_at.localeCompare(b.created_at)
      return s.date === 'asc' ? cmp : -cmp
    }
    return 0
  })
}

export function useViewerPlayback(playlist: ClientPlaylist | null) {
  const [mode, setMode] = useState<ViewerMode>('free')
  const [currentTrack, setCurrentTrack] = useState<Track | undefined>(undefined)
  const [isPlaying, setIsPlaying] = useState(false)
  const [seekSignal, setSeekSignal] = useState<SeekSignal>(null)
  const [syncing, setSyncing] = useState(false)
  const [sort, setSort] = useState<SortSettings>(DEFAULT_SORT)
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('all')
  const [shuffle, setShuffle] = useState(false)
  const [history, setHistory] = useState<Array<string>>([])

  const modeRef = useRef(mode)
  modeRef.current = mode
  const getPositionRef = useRef<() => number>(() => 0)

  const orderedTracks = useMemo(() => {
    if (!playlist) return []
    if (sort.order_mode === 'host') {
      const { vip, regular, background } = splitQueue(playlist)
      return [...vip, ...regular, ...background]
    }
    return sortTracks(playlist.track_data, sort)
  }, [playlist, sort])

  const seek = useCallback(
    (position: number) => setSeekSignal({ position, token: Date.now() }),
    [],
  )

  const playTrack = useCallback(
    (track: Track, position = 0) => {
      if (modeRef.current === 'synced') return
      setCurrentTrack((prev) => {
        if (prev && prev.id !== track.id)
          setHistory((h) => [...h, prev.id].slice(-50))
        return track
      })
      setIsPlaying(true)
      seek(position)
    },
    [seek],
  )

  const togglePlay = useCallback(() => {
    if (modeRef.current === 'synced') return
    setIsPlaying((p) => !p)
  }, [])

  const onPlayerStateChange = useCallback((playing: boolean) => {
    if (modeRef.current === 'synced') return
    setIsPlaying(playing)
  }, [])

  const next = useCallback(() => {
    if (modeRef.current === 'synced' || orderedTracks.length === 0) return true
    seek(0)

    if (!currentTrack) {
      playTrack(orderedTracks[0])
      return true
    }

    if (shuffle) {
      const pool = orderedTracks.filter((t) => t.id !== currentTrack.id)
      if (pool.length > 0) {
        playTrack(pool[Math.floor(Math.random() * pool.length)])
        return true
      }
      return false
    }

    const idx = orderedTracks.findIndex((t) => t.id === currentTrack.id)
    const nextTrack = idx === -1 ? orderedTracks[0] : orderedTracks[idx + 1]

    if (nextTrack) {
      playTrack(nextTrack)
    } else if (repeatMode === 'all') {
      playTrack(orderedTracks[0])
    }

    return nextTrack ? true : false
  }, [orderedTracks, currentTrack, shuffle, repeatMode, playTrack])

  const prev = useCallback(() => {
    if (modeRef.current === 'synced' || history.length === 0 || !playlist)
      return

    const prevId = history[history.length - 1]
    const track = playlist.track_data.find((t) => t.id === prevId)
    setHistory((h) => h.slice(0, -1))
    if (track) {
      setCurrentTrack(track)
      setIsPlaying(true)
      seek(0)
    }
  }, [history, playlist, seek])

  const handleEnded = useCallback(() => {
    if (modeRef.current === 'synced') return
    if (repeatMode === 'once') {
      seek(0)
      setIsPlaying(true)
      return
    }
    if (next()) setIsPlaying(true)
  }, [repeatMode, seek, next])

  function safeEmit(s: SocketLike | undefined, event: string, payload: any) {
    if (s !== undefined && s.emit) s.emit(event, payload)
  }

  const desync = useCallback(() => setMode('free'), [])

  const sync = useCallback(async () => {
    if (!playlist?.settings.sync_playback_position) return
    setSyncing(true)
    try {
      const state = await getPlaybackState(playlist.id)
      if (!state) return
      const track =
        playlist.track_data.find((t) => t.id === state.track_id) ??
        playlist.now_playing
      if (!track) return
      const paused = String(state.is_paused).toLowerCase() === 'true'
      const basePos = state.position ? parseFloat(state.position) : 0
      const drift =
        paused || !state.updated_at
          ? 0
          : (Date.now() - Date.parse(state.updated_at)) / 1000
      setMode('synced')
      setCurrentTrack(track)
      setIsPlaying(!paused)
      seek(Math.max(0, basePos + drift))
    } finally {
      setSyncing(false)
    }
  }, [playlist, seek])

  // Живая подписка, пока mode === 'synced'
  useEffect(() => {
    if (!playlist || mode !== 'synced') return
    const socket = getPlsUpdsSocket()

    const pauseStateHandler = (payload: any) => {
      const p = typeof payload === 'string' ? JSON.parse(payload) : payload
      if (!p || typeof p.is_paused !== 'boolean') return
      setIsPlaying(!p.is_paused)
      if (p.position === undefined) {
        const drift = p.is_paused
          ? 0
          : (Date.now() - Date.parse(p.updated_at)) / 1000
        const expected = p.position + drift
        if (
          Math.abs(expected - getPositionRef.current()) > DRIFT_THRESHOLD_SEC
        ) {
          seek(expected)
        }
        return
      }
      seek(p.position)
    }

    const seekStateHandler = (payload: any) => {
      const p = typeof payload === 'string' ? JSON.parse(payload) : payload
      if (!p || typeof p.position !== 'number') return
      seek(p.position)
    }
    const handlePlayNow = (payload: any) => {
      const p = typeof payload === 'string' ? JSON.parse(payload) : payload
      if (!p?.track_id) return
      const track = playlist.track_data.find((t) => t.id === p.track_id)
      if (!track) return
      setCurrentTrack(track)
      setIsPlaying(true)
      seek(0)
    }

    safeEmit(socket, 'playback_subscribe', { playlist_id: playlist.id })

    socket.on('playback_pause:' + playlist.id, pauseStateHandler)
    socket.on('playback_seek:' + playlist.id, seekStateHandler)
    socket.on('playnow:' + playlist.id, handlePlayNow)
    return () => {
      safeEmit(socket, 'playback_unsubscribe', { playlist_id: playlist.id })
      socket.off('playback_pause:' + playlist.id, pauseStateHandler)
      socket.off('playback_seek:' + playlist.id, seekStateHandler)
      socket.off('playnow:' + playlist.id, handlePlayNow)
    }
  }, [playlist, mode, seek])

  return {
    mode,
    currentTrack,
    isPlaying,
    seek,
    seekSignal,
    syncing,
    canSync: Boolean(playlist?.settings.sync_playback_position),
    sort,
    setSort,
    orderedTracks,
    repeatMode,
    setRepeatMode,
    shuffle,
    setShuffle,
    playTrack,
    togglePlay,
    onPlayerStateChange,
    next,
    prev,
    handleEnded,
    sync,
    desync,
    registerPositionGetter: (getter: () => number) => {
      getPositionRef.current = getter
    },
  }
}
