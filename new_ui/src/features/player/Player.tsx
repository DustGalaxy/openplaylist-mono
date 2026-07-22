import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import ReactPlayer from 'react-player'
import {
  MonitorPlay,
  Pause,
  Play,
  RefreshCw,
  Repeat,
  Repeat1,
  RepeatOff,
  SkipBack,
  SkipForward,
  Square,
  Volume2,
  VolumeX,
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
    if (feed.seekSignal)
      playerRef.current.currentTime = feed.seekSignal.position
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
      {contentAreaEl &&
        createPortal(
          <div
            className={cn(
              'absolute inset-x-0 top-0 z-30 flex justify-center overflow-hidden',
              'bg-level-1/50 backdrop-blur-sm ',
              'transition-[height,padding,border] duration-300 ease-in-out',
              hidden ? 'h-0 py-0' : 'h-full py-4 border-t border-level-3/40',
            )}
          >
            <ReactPlayer
              ref={setPlayerRef}
              className="w-4xl aspect-video rounded-(--rounded-std) overflow-hidden"
              src={videoUrl}
              style={{
                width: '860px',
                height: (860 / 16) * 9,
              }}
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
          </div>,
          contentAreaEl,
        )}

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

      <div className="grid items-center w-full gap-2 flex-wrap grid-cols-3">
        <div className="flex items-center gap-3 min-w-0">
          {track && (
            <img
              src={thumbnailUrl}
              alt=""
              className="h-10 aspect-video rounded-xs object-cover shrink-0"
            />
          )}
          <div className="min-w-0 flex flex-col">
            <span className="text-sm text-text-main truncate">
              {track?.title}
            </span>
            <span className="text-xs text-text-secondary truncate">
              {track?.from_owner}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 flex-wrap">
          <Btn
            onClick={cycleRepeat}
            aria-label={`repeat: ${feed.repeatMode}`}
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

          {feed.capabilities.canSkip && (
            <>
              <Btn
                onClick={feed.prev}
                aria-label="prev"
                className={controBtnStyle}
              >
                <SkipBack className="size-4" />
              </Btn>
            </>
          )}

          <Btn
            onClick={() => feed.onPlayerStateChange(!feed.playing)}
            aria-label={feed.playing ? 'pause' : 'play'}
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
              aria-label="next"
              className={controBtnStyle}
            >
              <SkipForward className="size-4" />
            </Btn>
          )}

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
                aria-label={volume === 0 ? 'unmute' : 'mute'}
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
        </div>

        <div className="flex items-center  gap-2 flex-wrap ">
          <div className="flex items-center gap-2 ml-auto">
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

          {feed.capabilities.canStop && feed.stop && (
            <Btn
              onClick={feed.stop}
              aria-label="stop"
              className={controBtnStyle}
            >
              <Square className="size-4" />
            </Btn>
          )}

          {feed.capabilities.canRequestSync && feed.requestSync && (
            <Btn
              onClick={feed.requestSync}
              aria-label="sync"
              className={controBtnStyle}
            >
              <RefreshCw className="size-4" />
            </Btn>
          )}

          <Btn
            onClick={() => setHidden(!hidden)}
            aria-label="toggle video"
            className={controBtnStyle}
          >
            <MonitorPlay className="size-4" />
          </Btn>
        </div>
      </div>
    </div>
  )
}
