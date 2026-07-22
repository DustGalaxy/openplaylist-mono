import React, { useCallback, useEffect, useRef, useState } from 'react'
import ReactPlayer from 'react-player'
import {
  Image as ImageIcon,
  Maximize,
  MonitorPlay,
  Pause,
  PictureInPicture2,
  Play,
  Repeat,
  Repeat1,
  RepeatOff,
  SkipBack,
  SkipForward,
  Square,
  Volume2,
  VolumeX,
} from 'lucide-react'
import type { Button } from '@/components/ui/button'
import Btn from '@/components/ui/my-btn'
import { Slider } from '@/components/ui/slider'
import { cn, formatTime } from '@/lib/utils'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import useMusicStore from '@/stores/musicStore'
import { getPlaybackPositionStore } from '@/lib/playbackPosition'
import { useThrottle } from '@/hooks/useThrottle'
import { usePlaylist } from '../context/playlist-context'

const RATES = [1, 1.5, 2] as const

const PLAYER_CONFIG = {
  youtube: { color: 'white' },
  vimeo: { color: 'ffffff' },
}

const initialState = {
  pip: false,
  playing: false,
  controls: false,
  light: false,
  volume: 1,
  muted: false,
  played: 0,
  loaded: 0,
  duration: 0,
  playbackRate: 1.0,
  repeatMode: 'none' as 'none' | 'all' | 'once',
  seeking: false,
  loadedSeconds: 0,
  playedSeconds: 0,
  hidden: true,
}

type PlayerState = typeof initialState

type PlayerBaseProps = {
  src?: string
  className?: string
}

export default function PlayerBase({ src, className }: PlayerBaseProps) {
  const playerRef = useRef<HTMLVideoElement | null>(null)
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const playlist = usePlaylist()
  const {
    playNext,
    playPrev,
    requestPlaybackState,
    getPlayerPosition,
    setGetPlayerPosition,
    clearPausedBackground,
    requestSeekState,
  } = useMusicStore()

  const [state, setState] = useState<PlayerState>(initialState)
  const {
    playing,
    controls,
    light,
    volume,
    muted,
    repeatMode,
    played,
    duration,
    playbackRate,
    pip,
    playedSeconds,
    hidden,
  } = state

  const playbackStore = getPlaybackPositionStore(
    playlist.settings.sync_playback_position,
  )

  // --- refs for logic that must not depend on render timing ---
  const isReadyRef = useRef(false)
  const playingRef = useRef(playing)
  playingRef.current = playing
  const isTabHiddenRef = useRef(false)
  const currentTrackRef = useRef(playlist.now_playing)
  currentTrackRef.current = playlist.now_playing

  // baseline for onSeeked drift-detection — kept in sync by handleTimeUpdate,
  // которое и так дергается на каждый timeupdate, отдельный интервал-семплер
  // (как в YoutubePlayer.tsx) тут не нужен
  const lastSampledPosRef = useRef<number>(0)
  const lastSampledAtRef = useRef<number>(Date.now())

  useEffect(() => {
    const handleVisibilityChange = () => {
      isTabHiddenRef.current = document.hidden
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () =>
      document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  useEffect(() => {
    setGetPlayerPosition(() => playerRef.current?.currentTime ?? 0)
    return () => setGetPlayerPosition(null)
  }, [setGetPlayerPosition])

  const savePosition = () => {
    const track = currentTrackRef.current
    const seconds = playerRef.current?.currentTime
    if (!track || seconds === undefined) return

    playbackStore
      .save(playlist.id, {
        track_id: track.id,
        position: seconds,
        updated_at: new Date().toISOString(),
      })
      .catch(() => {})
  }

  useEffect(() => {
    const heartbeat = window.setInterval(() => {
      if (!playingRef.current) return
      savePosition()
    }, 10000)

    window.addEventListener('beforeunload', savePosition)
    return () => {
      window.clearInterval(heartbeat)
      window.removeEventListener('beforeunload', savePosition)
      savePosition()
    }
  }, [playlist.id, playlist.settings.sync_playback_position])

  // resume должен сработать один раз на трек, не на каждый onReady
  useEffect(() => {
    isReadyRef.current = false
  }, [playlist.now_playing?.id])

  // useEffect(() => {
  //   console.log(state)
  // }, [state])

  const setPlayerRef = useCallback((player: HTMLVideoElement) => {
    if (!player) return
    playerRef.current = player
  }, [])

  const handlePlayPause = () => setState((s) => ({ ...s, playing: !s.playing }))

  const handleStop = () => {
    setState((s) => ({
      ...s,
      playing: false,
      played: 0,
      playedSeconds: 0,
      duration: 0,
    }))
    playNext(playlist, 'skipped', { id: undefined })
  }

  const handleToggleVisiability = () =>
    setState((s) => ({ ...s, hidden: !s.hidden }))

  // cycle: all -> once -> none -> all
  const handleCycleRepeatMode = () => {
    setState((s) => ({
      ...s,
      repeatMode:
        s.repeatMode === 'all'
          ? 'once'
          : s.repeatMode === 'once'
            ? 'none'
            : 'all',
    }))
  }

  const handlePrev = () => {
    playPrev(playlist.id)
  }

  const handleNext = () => {
    playNext(playlist, 'skipped')
  }

  const handleToggleMuted = () => setState((s) => ({ ...s, muted: !s.muted }))

  const handleVolumeChange = ([value]: Array<number>) =>
    setState((s) => ({ ...s, volume: value }))

  const handleSetPlaybackRate = (rate: number) =>
    setState((s) => ({ ...s, playbackRate: rate }))

  const handleRateChange = () => {
    const player = playerRef.current
    if (!player) return
    setState((s) => ({ ...s, playbackRate: player.playbackRate }))
  }

  const handlePlay = () => {
    const wasPaused = !playingRef.current
    setState((s) => ({ ...s, playing: true }))
    if (wasPaused && playerRef.current?.currentTime) {
      savePosition()
    }
  }

  const handlePause = () => {
    if (isTabHiddenRef.current) {
      return
    }
    if (!playingRef.current || !playerRef.current?.currentTime) return

    setState((s) => ({ ...s, playing: false }))
    savePosition()
  }

  const handleEnterPictureInPicture = () =>
    setState((s) => ({ ...s, pip: true }))

  const handleLeavePictureInPicture = () =>
    setState((s) => ({ ...s, pip: false }))

  const handleEnded = () => {
    if (state.repeatMode === 'once' && playerRef.current) {
      playerRef.current.currentTime = 0
      playerRef.current.play()
      return
    }
    playNext(playlist, 'listened')
  }

  const handleDurationChange = () => {
    const player = playerRef.current
    if (!player) return
    setState((s) => ({ ...s, duration: player.duration }))
  }

  const handleProgress = () => {
    const player = playerRef.current
    if (!player || state.seeking || !player.buffered?.length) return
    const loadedSeconds = player.buffered.end(player.buffered.length - 1)
    setState((s) => ({
      ...s,
      loadedSeconds,
      loaded: loadedSeconds / player.duration,
    }))
  }

  const handleTimeUpdate = () => {
    const player = playerRef.current
    if (!player || state.seeking || !player.duration) return

    const pos = player.currentTime
    // baseline для drift-детекта в onSeeked — обновляем на том же тике,
    // на котором и так обновляем played/playedSeconds
    lastSampledPosRef.current = pos
    lastSampledAtRef.current = Date.now()

    setState((s) => ({
      ...s,
      playedSeconds: pos,
      played: pos / player.duration,
    }))
  }

  // Radix Slider: onValueChange fires while dragging, onValueCommit on release
  const handleSeekChange = ([value]: Array<number>) =>
    setState((s) => ({ ...s, seeking: true, played: value }))

  const handleSeekCommit = async ([value]: Array<number>) => {
    setState((s) => ({ ...s, seeking: false }))
    if (playerRef.current) {
      playerRef.current.currentTime = value * playerRef.current.duration

      if (!currentTrackRef.current || !playlist.settings.sync_playback_position)
        return

      await requestSeekState(
        playlist.id,
        value * playerRef.current.duration,
        currentTrackRef.current.id,
      )
    }
  }

  // native onSeeked — фильтруем "шумные" сики, которые react-player сам
  // генерирует внутри (см. заметку про MediaPlayedRangesMixin), реальный
  // сик (юзер дернул ползунок нативных controls, экстеншен и т.п.) шлём
  // на бэкенд для синхронизации зрителей
  // const runSeek = async (event: { time: number | undefined }) => {
  //   const track = currentTrackRef.current
  //   if (
  //     !track ||
  //     event?.time === undefined ||
  //     !playlist.settings.sync_playback_position
  //   )
  //     return

  //   const expectedElapsed = !playingRef.current
  //     ? 0
  //     : (Date.now() - lastSampledAtRef.current) / 1000
  //   const expectedPos = lastSampledPosRef.current + expectedElapsed
  //   const drift = Math.abs(event.time - expectedPos)

  //   if (drift < 2) return

  //   await requestSeekState(playlist.id, event.time, track.id)
  // }
  // const handleSeek = useThrottle(runSeek, 1000)

  // резюм позиции: paused_background (VIP-прерывание) приоритетнее
  // сохранённой в playbackStore позиции, срабатывает 1 раз на трек
  const handleReady = async () => {
    if (isReadyRef.current || !src || !playerRef.current) return
    isReadyRef.current = true

    const paused = playlist.paused_background
    let pos = 0

    if (paused && paused.track_id === playlist.now_playing?.id) {
      clearPausedBackground(playlist.id)
      pos = paused.position
    } else if (playlist.now_playing) {
      try {
        const saved = await playbackStore.load(playlist.id)
        if (saved && saved.track_id === playlist.now_playing.id) {
          pos = saved.position
        }
      } catch {}
    }

    playerRef.current.currentTime = pos
  }

  // // ponytail: screenfull not in deps, native Fullscreen API is enough here
  // const handleClickFullscreen = () => {
  //   wrapperRef.current?.requestFullscreen?.()
  // }
  const controBtnStyle = 'p-1 rounded-sm size-8 bg-level-2'
  return (
    <div
      ref={wrapperRef}
      className={cn('flex flex-col gap-3 w-full', className)}
    >
      <div
        className={cn(hidden ? 'hidden' : 'items-center justify-center hidden')}
      >
        <ReactPlayer
          ref={setPlayerRef}
          className="w-80 sm:w-160 aspect-video"
          // style={{ width: '640', height: 'auto', aspectRatio: '16/9' }}
          src={src}
          pip={pip}
          playing={playing}
          controls={controls}
          light={light}
          loop={false}
          playbackRate={playbackRate}
          volume={volume}
          muted={muted}
          config={PLAYER_CONFIG}
          onReady={handleReady}
          // onSeeked={handleSeek}
          onPlay={handlePlay}
          // onPause={handlePause}
          onEnterPictureInPicture={handleEnterPictureInPicture}
          onLeavePictureInPicture={handleLeavePictureInPicture}
          onRateChange={handleRateChange}
          onEnded={handleEnded}
          onError={(e) => console.debug('[PlayerBase] onError', e)}
          onTimeUpdate={handleTimeUpdate}
          onProgress={handleProgress}
          onDurationChange={handleDurationChange}
        />
      </div>

      {/* seek */}
      <div className="flex items-center gap-2">
        <Slider
          value={[played]}
          min={0}
          max={0.999999}
          step={0.001}
          onValueChange={handleSeekChange}
          onValueCommit={handleSeekCommit}
          className="ring-text-main/10 ring-1 rounded-full"
        />
        <span className="text-xs text-text-secondary whitespace-nowrap tabular-nums">
          {formatTime(playedSeconds)} /{' '}
          {formatTime(duration > 1 ? duration - 1 : duration)}
        </span>
      </div>

      {/* transport */}
      <div className="flex items-center gap-2 flex-wrap">
        <Btn
          onClick={handleCycleRepeatMode}
          aria-label={`repeat: ${repeatMode}`}
          className={controBtnStyle}
        >
          {repeatMode === 'all' ? (
            <Repeat className="size-4" />
          ) : repeatMode === 'once' ? (
            <Repeat1 className="size-4" />
          ) : (
            <RepeatOff className="size-4" />
          )}
        </Btn>

        <Btn onClick={handlePrev} aria-label="prev" className={controBtnStyle}>
          <SkipBack className="size-4" />
        </Btn>
        <Btn
          onClick={handlePlayPause}
          aria-label={playing ? 'pause' : 'play'}
          className={cn(controBtnStyle, 'size-10')}
        >
          {playing ? <Pause className="size-6" /> : <Play className="size-6" />}
        </Btn>
        <Btn onClick={handleNext} aria-label="next" className={controBtnStyle}>
          <SkipForward className="size-4" />
        </Btn>

        <HoverCard key={'right'} openDelay={0} closeDelay={0}>
          <HoverCardTrigger>
            <Btn
              onClick={handleToggleMuted}
              aria-label={muted ? 'unmute' : 'mute'}
              className={controBtnStyle}
            >
              {muted ? (
                <VolumeX className="size-4" />
              ) : (
                <Volume2 className="size-4" />
              )}
            </Btn>
          </HoverCardTrigger>
          <HoverCardContent
            side={'right'}
            className="w-fit bg-transparent h-fit p-2 ring-1 ring-level-3 border-0"
          >
            <Slider
              className="w-20 ring-text-main/10 ring-1 rounded-full"
              value={[muted ? 0 : volume]}
              min={0}
              max={1}
              step={0.01}
              onValueChange={handleVolumeChange}
            />
          </HoverCardContent>
        </HoverCard>

        <div className="flex items-center gap-2 ml-auto">
          {RATES.map((rate) => (
            <Btn
              key={rate}
              isActive={playbackRate === rate}
              onClick={() => handleSetPlaybackRate(rate)}
              className={cn(controBtnStyle, 'text-xs px-2')}
            >
              {rate}x
            </Btn>
          ))}
        </div>
        <Btn onClick={handleStop} aria-label="stop" className={controBtnStyle}>
          <Square className="size-4" />
        </Btn>

        <Btn
          onClick={handleToggleVisiability}
          aria-label="native controls"
          className={controBtnStyle}
        >
          <MonitorPlay className="size-4" />
        </Btn>
        {/* {src && ReactPlayer.canEnablePIP?.(src) && (
          <Btn
            onClick={handleTogglePIP}
            isActive={pip}
            aria-label="pip"
            className={controBtnStyle}
          >
            <PictureInPicture2 className="size-4" />
          </Btn>
        )} */}
        {/* <Btn
          onClick={handleClickFullscreen}
          aria-label="fullscreen"
          className={controBtnStyle}
        >
          <Maximize className="size-4" />
        </Btn>
     
        <Btn
          onClick={handleToggleLight}
          isActive={light}
          aria-label="light mode"
          className={controBtnStyle}
        >
          <ImageIcon className="size-4" />
        </Btn> */}
      </div>
    </div>
  )
}
