import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import ReactPlayer from 'react-player'
import { useTranslation } from 'react-i18next'
import {
  MonitorPlay,
  Pause,
  Play,
  RefreshCw,
  Repeat,
  Repeat1,
  RepeatOff,
  Shuffle,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Square,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import type { PlaybackFeed } from './types'
import Btn from '@/components/ui/my-btn'
import { Slider } from '@/components/ui/slider'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import { cn, formatTime } from '@/lib/utils'
import { useAppSettingsStore } from '@/stores/appSettingsStore'
import { useLayoutStore } from '@/stores/layoutStore'

const RATES = [1, 1.5, 2] as const
const PLAYER_CONFIG = { youtube: { color: 'white' } }
const controBtnStyle = 'p-1 rounded-sm size-9 bg-level-2'

export default function Player({
  feed,
  className,
}: {
  feed: PlaybackFeed
  className?: string
}) {
  const { t } = useTranslation('player')
  const playerRef = useRef<HTMLVideoElement | null>(null)
  const isReadyRef = useRef(false)
  const lastSeekTokenRef = useRef<number | null>(null)
  const isTabHiddenRef = useRef(false)

  const contentAreaEl = useLayoutStore((s) => s.contentAreaEl)

  const setVolume = (v: number) => setSetting('playerVolume', v)
  const setMutedVolume = (v: number) => setSetting('playerMutedVolume', v)
  const setPlaybackRate = (v: number) => setSetting('playerPlaybackRate', v)
  const setHidden = (v: boolean) => setSetting('playerHidden', v)

  const {
    playerVolume: volume,
    playerMutedVolume: mutedVolume,
    playerPlaybackRate: playbackRate,
    playerHidden: hidden,
  } = useAppSettingsStore((s) => s.settings)

  const setSetting = useAppSettingsStore((s) => s.setSetting)
  const [liveVolume, setLiveVolume] = useState<number | null>(null)
  const [showExtraControls, setShowExtraControls] = useState(false)

  const [played, setPlayed] = useState(0)
  const [playedSeconds, setPlayedSeconds] = useState(0)
  const [duration, setDuration] = useState(0)
  const [seeking, setSeeking] = useState(false)

  useEffect(() => {
    const onVis = () => {
      isTabHiddenRef.current = document.hidden
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  const track = feed.nowPlayingTrack
  const videoUrl = track
    ? `https://www.youtube.com/watch?v=${track.yt_video_id}`
    : undefined
  const thumbnailUrl = track
    ? `https://img.youtube.com/vi/${track.yt_video_id}/mqdefault.jpg`
    : undefined

  useEffect(() => {
    feed.registerPositionGetter(() => playerRef.current?.currentTime ?? 0)
  }, [feed.registerPositionGetter])

  useEffect(() => {
    isReadyRef.current = false
  }, [track?.id])

  useEffect(() => {
    if (!feed.seekSignal || feed.seekSignal.token === lastSeekTokenRef.current)
      return
    lastSeekTokenRef.current = feed.seekSignal.token
    const pos = feed.seekSignal.position

    if (playerRef.current && typeof pos === 'number' && Number.isFinite(pos)) {
      playerRef.current.currentTime = pos
    }
  }, [feed.seekSignal])

  const setPlayerRef = useCallback((player: HTMLVideoElement) => {
    if (!player) return
    playerRef.current = player
  }, [])

  const handleReady = () => {
    if (isReadyRef.current || !feed.nowPlayingTrack || !playerRef.current)
      return
    isReadyRef.current = true
    if (feed.seekSignal && feed.seekSignal.token !== lastSeekTokenRef.current) {
      lastSeekTokenRef.current = feed.seekSignal.token
      playerRef.current.currentTime = feed.seekSignal.position
    }
  }

  const handlePause = () => {
    if (isTabHiddenRef.current) return
    feed.onPlayerStateChange(false)
  }

  const handleTimeUpdate = () => {
    const p = playerRef.current
    if (!p || seeking || !p.duration) return
    setPlayedSeconds(p.currentTime)
    setPlayed(p.currentTime / p.duration)
  }

  const handleSeekCommit = ([value]: Array<number>) => {
    setSeeking(false)
    if (!feed.capabilities.canSeekArbitrary || !playerRef.current) return
    feed.seek(value * playerRef.current.duration)
  }

  const handleEnd = () => {
    feed.onEnded()
  }

  const cycleRepeat = () => {
    const nextMode =
      feed.repeatMode === 'all'
        ? 'once'
        : feed.repeatMode === 'once'
          ? 'none'
          : 'all'
    feed.setRepeatMode(nextMode)
  }

  return (
    <div className={cn('flex flex-col gap-3 w-full', className)}>
      {/* Video Overlay Modal Portal — Fills content area */}
      {contentAreaEl &&
        createPortal(
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setHidden(true)
              }
            }}
            className={cn(
              'absolute inset-0 z-30 flex justify-center items-center overflow-hidden p-2 sm:p-4',
              'bg-level-1/90 backdrop-blur-md',
              'transition-[height,padding,border,opacity] duration-300 ease-in-out',
              hidden
                ? 'h-0 py-0 opacity-0 pointer-events-none'
                : 'h-full border-t border-level-3/40 opacity-100',
            )}
          >
            <div className="relative w-full h-full max-w-5xl max-h-[calc(100vh-120px)] aspect-video rounded-(--rounded-std) overflow-hidden shadow-2xl border border-level-3/40 bg-black flex items-center justify-center">
              <Btn
                onClick={() => setHidden(true)}
                aria-label={t('controls.closeVideo', 'Close video player')}
                className="absolute top-3 right-3 z-40 p-1.5 rounded-sm bg-level-2 text-text-main backdrop-blur-sm border border-white/20 transition-all cursor-pointer"
              >
                <X className="size-5" />
              </Btn>

              <ReactPlayer
                ref={setPlayerRef}
                className="w-full h-full"
                width="100%"
                height="100%"
                src={videoUrl}
                playing={feed.playing}
                volume={liveVolume ?? volume}
                muted={volume === 0}
                playbackRate={playbackRate}
                config={PLAYER_CONFIG}
                onReady={handleReady}
                onPlay={() => feed.onPlayerStateChange(true)}
                onPause={handlePause}
                onEnded={handleEnd}
                onTimeUpdate={handleTimeUpdate}
                onDurationChange={() =>
                  setDuration(playerRef.current?.duration ?? 0)
                }
              />
            </div>
          </div>,
          contentAreaEl,
        )}

      {/* Secondary Controls Overlay Portal — Fills content area using L158-L190 pattern */}
      {contentAreaEl &&
        createPortal(
          <div
            className={cn(
              'absolute inset-0 z-20 flex flex-col justify-end items-center overflow-hidden p-3 sm:p-4',
              'bg-level-1/80 backdrop-blur-md',
              'transition-[height,padding,border,opacity] duration-300 ease-in-out',
              showExtraControls
                ? 'h-full border-t border-level-3/40 opacity-100'
                : 'h-0 py-0 opacity-0 pointer-events-none',
            )}
          >
            <div className="relative w-full max-w-lg bg-level-2/95 border border-level-3/50 rounded-2xl p-4 shadow-2xl flex flex-col gap-4 mb-2">
              {/* Header with Track Info */}
              <div className="flex items-center justify-between gap-3 pb-3 border-b border-level-3/30">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {track && (
                    <img
                      src={thumbnailUrl}
                      alt=""
                      className="h-10 aspect-video rounded-xs object-cover shrink-0"
                    />
                  )}
                  <div className="min-w-0 flex flex-col flex-1">
                    <span className="text-xs sm:text-sm font-semibold text-text-main truncate">
                      {track?.title}
                    </span>
                    <span className="text-[11px] sm:text-xs text-text-secondary truncate">
                      {track?.from_owner}
                    </span>
                  </div>
                </div>
                <Btn
                  onClick={() => setShowExtraControls(false)}
                  aria-label={t('controls.close', 'Close')}
                  className="p-1 rounded-sm size-8 bg-level-2 hover:bg-level-3 shrink-0"
                >
                  <X className="size-4" />
                </Btn>
              </div>

              {/* Playback Rates */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-text-secondary font-medium">
                  {t('controls.speed', 'Playback speed')}
                </span>
                <div className="flex items-center gap-2">
                  {RATES.map((rate) => (
                    <Btn
                      key={rate}
                      isActive={playbackRate === rate}
                      onClick={() => setPlaybackRate(rate)}
                      className={cn(controBtnStyle, 'flex-1 text-xs py-1.5')}
                    >
                      {rate}x
                    </Btn>
                  ))}
                </div>
              </div>

              {/* Volume Slider */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-text-secondary font-medium">
                  {t('controls.volume', 'Volume')}
                </span>
                <div className="flex items-center gap-3 bg-level-1/60 p-2.5 rounded-xl border border-level-3/30">
                  <Btn
                    onClick={() =>
                      setVolume(
                        volume === 0
                          ? mutedVolume > 0
                            ? mutedVolume
                            : 0.5
                          : 0,
                      )
                    }
                    onMouseDown={() => {
                      if (volume !== 0) setMutedVolume(volume)
                    }}
                    className={controBtnStyle}
                  >
                    {liveVolume === 0 || volume === 0 ? (
                      <VolumeX className="size-4" />
                    ) : (
                      <Volume2 className="size-4" />
                    )}
                  </Btn>
                  <Slider
                    className="flex-1 ring-text-main/30 ring-1 rounded-full"
                    value={[liveVolume ?? volume]}
                    min={0}
                    max={1}
                    step={0.01}
                    onValueCommit={([v]) => setVolume(v)}
                    onValueChange={([v]) => setLiveVolume(v)}
                  />
                  <span className="text-xs text-text-secondary w-8 text-right font-mono">
                    {Math.round((liveVolume ?? volume) * 100)}%
                  </span>
                </div>
              </div>

              {/* Quick Actions (Stop, Sync, Toggle Video) */}
              <div className="flex items-center justify-around gap-2 pt-1 border-t border-level-3/30">
                {feed.capabilities.canStop && feed.stop && (
                  <Btn
                    onClick={feed.stop}
                    aria-label={t('controls.stop', 'Stop playback')}
                    className={cn(
                      controBtnStyle,
                      'flex-1 flex gap-2 justify-center',
                    )}
                  >
                    <Square className="size-4" />
                    <span className="text-xs">
                      {t('controls.stop', 'Stop')}
                    </span>
                  </Btn>
                )}

                {feed.capabilities.canRequestSync && feed.requestSync && (
                  <Btn
                    onClick={feed.requestSync}
                    aria-label={t('controls.sync', 'Request player sync')}
                    className={cn(
                      controBtnStyle,
                      'flex-1 flex gap-2 justify-center',
                    )}
                  >
                    <RefreshCw className="size-4" />
                    <span className="text-xs">
                      {t('controls.sync', 'Sync')}
                    </span>
                  </Btn>
                )}

                <Btn
                  onClick={() => {
                    setHidden(!hidden)
                    if (hidden) setShowExtraControls(false)
                  }}
                  isActive={!hidden}
                  aria-label={t(
                    'controls.toggleVideo',
                    'Toggle video player display',
                  )}
                  className={cn(
                    controBtnStyle,
                    'flex-1 flex gap-2 justify-center',
                  )}
                >
                  <MonitorPlay className="size-4" />
                  <span className="text-xs">
                    {t('controls.toggleVideoShort', 'Video')}
                  </span>
                </Btn>
              </div>
            </div>
          </div>,
          contentAreaEl,
        )}

      {/* Progress Bar & Timestamps */}
      <div className="flex items-center gap-2">
        <Slider
          value={[played]}
          min={0}
          max={0.999999}
          step={0.0003}
          disabled={!feed.capabilities.canSeekArbitrary}
          onValueChange={([v]) => {
            setSeeking(true)
            setPlayed(v)
          }}
          onValueCommit={handleSeekCommit}
          className="ring-text-main/20 ring-1 rounded-full"
        />
        <span className="text-xs text-text-secondary whitespace-nowrap tabular-nums">
          {formatTime(playedSeconds)} /
          {formatTime(duration > 1 ? duration - 1 : duration)}
        </span>
      </div>

      {/* Mobile Player Controls Layout (< md / 360px) */}
      <div className="flex flex-col md:hidden w-full gap-2">
        {/* Row 1: Track Information & Secondary Controls Toggle */}
        <div className="flex items-center justify-between gap-2.5 w-full">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            {track && (
              <img
                src={thumbnailUrl}
                alt=""
                className="h-9 aspect-video rounded-xs object-cover shrink-0"
              />
            )}
            <div className="min-w-0 flex flex-col flex-1">
              <span className="text-xs sm:text-sm text-text-main truncate font-medium">
                {track?.title}
              </span>
              <span className="text-[11px] text-text-secondary truncate">
                {track?.from_owner}
              </span>
            </div>
          </div>
          <Btn
            onClick={() => setShowExtraControls(!showExtraControls)}
            isActive={showExtraControls}
            aria-label={t('controls.extraControls', 'Secondary Controls')}
            className={controBtnStyle}
          >
            <SlidersHorizontal className="size-4" />
          </Btn>
        </div>

        {/* Row 2: Touch-Friendly Main Playback Controls */}
        <div className="flex items-center justify-center gap-2.5 sm:gap-3 w-full">
          <Btn
            isActive={feed.shuffle}
            onClick={() => feed.setShuffle(!feed.shuffle)}
            aria-label={t(
              'controls.shuffle',
              feed.shuffle ? 'Disable shuffle' : 'Enable shuffle',
            )}
            className="p-1 rounded-sm size-10 bg-level-2"
          >
            <Shuffle className="size-5" />
          </Btn>

          {feed.capabilities.canSkip && (
            <Btn
              onClick={feed.prev}
              aria-label={t('controls.prev', 'Previous track')}
              className="p-1 rounded-sm size-10 bg-level-2"
            >
              <SkipBack className="size-5" />
            </Btn>
          )}

          <Btn
            onClick={() => feed.onPlayerStateChange(!feed.playing)}
            aria-label={
              feed.playing
                ? t('controls.pause', 'Pause')
                : t('controls.play', 'Play')
            }
            className="p-1 rounded-sm size-12 bg-level-2"
          >
            {feed.playing ? (
              <Pause className="size-6" />
            ) : (
              <Play className="size-6" />
            )}
          </Btn>

          {feed.capabilities.canSkip && (
            <Btn
              onClick={feed.next}
              aria-label={t('controls.next', 'Next track')}
              className="p-1 rounded-sm size-10 bg-level-2"
            >
              <SkipForward className="size-5" />
            </Btn>
          )}

          <Btn
            onClick={cycleRepeat}
            isActive={feed.repeatMode !== 'none'}
            aria-label={t('controls.repeat', {
              mode: feed.repeatMode,
              defaultValue: `Repeat: ${feed.repeatMode}`,
            })}
            className="p-1 rounded-sm size-10 bg-level-2"
          >
            {feed.repeatMode === 'all' ? (
              <Repeat className="size-5" />
            ) : feed.repeatMode === 'once' ? (
              <Repeat1 className="size-5" />
            ) : (
              <RepeatOff className="size-5" />
            )}
          </Btn>
        </div>
      </div>

      {/* Desktop Player Controls Layout (>= md) */}
      <div className="hidden md:grid items-center w-full gap-2 grid-cols-3">
        {/* Left: Track Information */}
        <div className="flex items-center gap-3 min-w-0">
          {track && (
            <img
              src={thumbnailUrl}
              alt=""
              className="h-10 aspect-video rounded-xs object-cover shrink-0"
            />
          )}
          <div className="min-w-0 flex flex-col flex-1">
            <span className="text-sm text-text-main truncate font-medium">
              {track?.title}
            </span>
            <span className="text-xs text-text-secondary truncate">
              {track?.from_owner}
            </span>
          </div>
        </div>

        {/* Center: Playback Controls */}
        <div className="flex items-center justify-center gap-2 flex-wrap">
          <Btn
            isActive={feed.shuffle}
            onClick={() => feed.setShuffle(!feed.shuffle)}
            aria-label={t(
              'controls.shuffle',
              feed.shuffle ? 'Disable shuffle' : 'Enable shuffle',
            )}
            className={controBtnStyle}
          >
            <Shuffle className="size-4" />
          </Btn>

          {feed.capabilities.canSkip && (
            <Btn
              onClick={feed.prev}
              aria-label={t('controls.prev', 'Previous track')}
              className={controBtnStyle}
            >
              <SkipBack className="size-4" />
            </Btn>
          )}

          <Btn
            onClick={() => feed.onPlayerStateChange(!feed.playing)}
            aria-label={
              feed.playing
                ? t('controls.pause', 'Pause')
                : t('controls.play', 'Play')
            }
            className={cn(controBtnStyle, 'size-12')}
          >
            {feed.playing ? (
              <Pause className="size-7" />
            ) : (
              <Play className="size-7" />
            )}
          </Btn>

          {feed.capabilities.canSkip && (
            <Btn
              onClick={feed.next}
              aria-label={t('controls.next', 'Next track')}
              className={controBtnStyle}
            >
              <SkipForward className="size-4" />
            </Btn>
          )}

          <Btn
            onClick={cycleRepeat}
            isActive={feed.repeatMode !== 'none'}
            aria-label={t('controls.repeat', {
              mode: feed.repeatMode,
              defaultValue: `Repeat: ${feed.repeatMode}`,
            })}
            className={controBtnStyle}
          >
            {feed.repeatMode === 'all' ? (
              <Repeat className="size-4" />
            ) : feed.repeatMode === 'once' ? (
              <Repeat1 className="size-4" />
            ) : (
              <RepeatOff className="size-4" />
            )}
          </Btn>
        </div>

        {/* Right: Secondary Actions */}
        <div className="flex items-center justify-end gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            {RATES.map((rate) => (
              <Btn
                key={rate}
                isActive={playbackRate === rate}
                onClick={() => setPlaybackRate(rate)}
                className={cn(controBtnStyle, 'text-xs px-2')}
              >
                {rate}x
              </Btn>
            ))}
          </div>

          <HoverCard openDelay={0} closeDelay={100}>
            <HoverCardTrigger>
              <Btn
                onClick={() =>
                  setVolume(
                    volume === 0 ? (mutedVolume > 0 ? mutedVolume : 0.5) : 0,
                  )
                }
                onMouseDown={() => {
                  if (volume !== 0) setMutedVolume(volume)
                }}
                aria-label={
                  volume === 0
                    ? t('controls.unmute', 'Unmute audio')
                    : t('controls.mute', 'Mute audio')
                }
                className={controBtnStyle}
              >
                {liveVolume === 0 || volume === 0 ? (
                  <VolumeX className="size-4" />
                ) : (
                  <Volume2 className="size-4" />
                )}
              </Btn>
            </HoverCardTrigger>
            <HoverCardContent
              side="right"
              className="w-fit bg-transparent h-fit p-4 ring-1 ring-level-3 border-0"
            >
              <Slider
                className="w-20 ring-text-main/30 ring-1 rounded-full"
                value={[liveVolume ?? volume]}
                min={0}
                max={1}
                step={0.01}
                onValueCommit={([v]) => setVolume(v)}
                onValueChange={([v]) => setLiveVolume(v)}
              />
            </HoverCardContent>
          </HoverCard>

          {feed.capabilities.canStop && feed.stop && (
            <Btn
              onClick={feed.stop}
              aria-label={t('controls.stop', 'Stop playback')}
              className={controBtnStyle}
            >
              <Square className="size-4" />
            </Btn>
          )}

          {feed.capabilities.canRequestSync && feed.requestSync && (
            <Btn
              onClick={feed.requestSync}
              aria-label={t('controls.sync', 'Request player sync')}
              className={controBtnStyle}
            >
              <RefreshCw className="size-4" />
            </Btn>
          )}

          <Btn
            onClick={() => setHidden(!hidden)}
            isActive={!hidden}
            aria-label={t(
              'controls.toggleVideo',
              'Toggle video player display',
            )}
            className={controBtnStyle}
          >
            <MonitorPlay className="size-4" />
          </Btn>
        </div>
      </div>
    </div>
  )
}
