import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import ReactPlayer from 'react-player'
import { useTranslation } from 'react-i18next'
import {
  MonitorPlay,
  Pause,
  Play,
  Repeat,
  Repeat1,
  RepeatOff,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import type { PlaybackFeed } from './types'
import { useAudioKeepAlive } from './hooks/useAudioKeepAlive'
import { useMediaSession } from './hooks/useMediaSession'
import Btn from '@/components/ui/my-btn'
import { Slider } from '@/components/ui/slider'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import PlayerOptionsPopover from './components/PlayerOptionsPopover'
import { cn, formatTime, parseDurationSeconds } from '@/lib/utils'
import { useAppSettingsStore } from '@/stores/appSettingsStore'
import { useLayoutStore } from '@/stores/layoutStore'
import { usePlaylistStore } from '@/stores/playlistStore'
import { usePlaybackStore } from '@/stores/playbackStore'
import { useAuthStore } from '@/stores/authStore'
import { fetchModeratedChannels } from '@/api/api-moderators'

const RATES = [1, 1.5, 2] as const
const PLAYER_CONFIG = {
  youtube: {
    color: 'white',
    playerVars: {
      autoplay: 1,
      playsinline: 1,
      modestbranding: 1,
      rel: 0,
    },
  },
}
const controBtnStyle = 'p-1 rounded-sm size-8.5 sm:size-9 bg-level-2'

export default function Player({
  feed,
  className,
}: {
  feed: PlaybackFeed
  className?: string
}) {
  const { t } = useTranslation('player')
  const playerRef = useRef<any>(null)
  const isReadyRef = useRef(false)
  const lastSeekTokenRef = useRef<number | null>(null)
  const isTabHiddenRef = useRef(false)
  const endedHandledTrackIdRef = useRef<string | null>(null)

  // Keep background audio active to prevent browser tab throttling/freezing
  useAudioKeepAlive(feed.playing)

  // Connect native OS media controls and metadata
  useMediaSession(feed)

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

  // UserPlayer V2 & Moderation state
  const playerMode = usePlaybackStore((s) => s.playerMode)
  const setModeratedChannels = usePlaybackStore((s) => s.setModeratedChannels)

  const playlistId = usePlaylistStore((s) => s.slots.player.playlistId)
  const playlist = usePlaylistStore((s) =>
    playlistId ? s.cache[playlistId]?.data : undefined,
  )

  useEffect(() => {
    const loadChannels = async () => {
      try {
        const channels = await fetchModeratedChannels()
        setModeratedChannels(channels)
      } catch (err) {
        console.error('Failed to load moderated channels:', err)
      }
    }
    void loadChannels()
  }, [setModeratedChannels])

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

  const playedSecondsRef = useRef(playedSeconds)
  playedSecondsRef.current = playedSeconds

  useEffect(() => {
    feed.registerPositionGetter(() => {
      if (playerMode === 'control') {
        return playedSecondsRef.current ?? 0
      }
      try {
        const cur =
          playerRef.current?.getCurrentTime?.() ??
          playerRef.current?.currentTime
        if (typeof cur === 'number' && !isNaN(cur) && cur > 0) {
          return cur
        }
        return playedSecondsRef.current ?? 0
      } catch {
        return playedSecondsRef.current ?? 0
      }
    })
  }, [feed.registerPositionGetter, playerMode])

  const safeDuration =
    typeof duration === 'number' && !isNaN(duration) && duration > 0
      ? duration
      : parseDurationSeconds(track?.duration_seconds ?? track?.duration)

  const safePlayedSeconds =
    typeof playedSeconds === 'number' &&
    !isNaN(playedSeconds) &&
    isFinite(playedSeconds) &&
    playedSeconds >= 0
      ? playedSeconds
      : 0

  const prevTrackIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (track?.id && track.id !== prevTrackIdRef.current) {
      prevTrackIdRef.current = track.id
      isReadyRef.current = false
      endedHandledTrackIdRef.current = null
      setPlayed(0)
      setPlayedSeconds(0)
      const parsedDur = parseDurationSeconds(
        track.duration_seconds ?? track.duration,
      )
      if (parsedDur > 0) {
        setDuration(parsedDur)
      }
    } else if (track) {
      const parsedDur = parseDurationSeconds(
        track.duration_seconds ?? track.duration,
      )
      if (parsedDur > 0 && !duration) {
        setDuration(parsedDur)
      }
    }
  }, [track?.id, track?.duration_seconds, track?.duration])

  useEffect(() => {
    if (!feed.seekSignal || feed.seekSignal.token === lastSeekTokenRef.current)
      return
    lastSeekTokenRef.current = feed.seekSignal.token
    const pos = feed.seekSignal.position

    if (typeof pos === 'number' && Number.isFinite(pos) && !isNaN(pos)) {
      if (playerRef.current) {
        try {
          if (typeof playerRef.current.seekTo === 'function') {
            playerRef.current.seekTo(pos, 'seconds')
          } else {
            playerRef.current.currentTime = pos
          }
        } catch {}
      }
      setPlayedSeconds(pos)
      const dur = safeDuration || 1
      if (dur > 0) setPlayed(Math.min(1, Math.max(0, pos / dur)))
    }
  }, [feed.seekSignal, safeDuration])

  useEffect(() => {
    if (playerMode !== 'control' || !feed.playing) return
    const dur = safeDuration > 0 ? safeDuration : 1
    const interval = window.setInterval(() => {
      setPlayedSeconds((prev) => {
        const safePrev =
          typeof prev === 'number' && !isNaN(prev) && isFinite(prev) ? prev : 0
        if (safeDuration > 0 && safePrev >= safeDuration) {
          return safePrev
        }
        const nextSec = safePrev + 1
        if (dur > 0) setPlayed(Math.min(1, Math.max(0, nextSec / dur)))
        return nextSec
      })
    }, 1000)
    return () => window.clearInterval(interval)
  }, [playerMode, feed.playing, safeDuration])

  const setPlayerRef = useCallback((player: any) => {
    playerRef.current = player
  }, [])

  const handleReady = () => {
    if (!feed.nowPlayingTrack || !playerRef.current) return
    isReadyRef.current = true
    if (feed.seekSignal && feed.seekSignal.token !== lastSeekTokenRef.current) {
      lastSeekTokenRef.current = feed.seekSignal.token
      try {
        if (typeof playerRef.current.seekTo === 'function') {
          playerRef.current.seekTo(feed.seekSignal.position, 'seconds')
        } else {
          playerRef.current.currentTime = feed.seekSignal.position
        }
      } catch {}
    }
  }

  const handleEnd = useCallback(() => {
    if (!track?.id || endedHandledTrackIdRef.current === track.id) return
    endedHandledTrackIdRef.current = track.id
    feed.onEnded()
  }, [track?.id, feed.onEnded])

  const handlePause = () => {
    const p = playerRef.current
    try {
      const cur = p?.getCurrentTime?.() ?? p?.currentTime ?? 0
      const dur = p?.getDuration?.() ?? p?.duration ?? safeDuration
      if (
        dur > 2 &&
        cur >= dur - 1.0 &&
        track?.id &&
        endedHandledTrackIdRef.current !== track.id
      ) {
        handleEnd()
        return
      }
    } catch {}
  }

  const handleSeekCommit = ([value]: Array<number>) => {
    setSeeking(false)
    const newPlayed = value
    setPlayed(newPlayed)
    const calculatedDuration = safeDuration || 1
    const newSeconds = newPlayed * calculatedDuration
    setPlayedSeconds(newSeconds)
    feed.seek(newSeconds)
  }

  const cycleRepeat = () => {
    const modes: Array<'none' | 'all' | 'once'> = ['none', 'all', 'once']
    const nextIndex = (modes.indexOf(feed.repeatMode) + 1) % modes.length
    feed.setRepeatMode(modes[nextIndex])
  }

  return (
    <div
      className={cn(
        'w-full flex flex-col gap-1.5 min-w-0 max-w-(--screen-max-width) mx-auto',
        className,
      )}
    >
      {/* Video Overlay Modal & Persistent Player Portal */}
      {contentAreaEl &&
        createPortal(
          <div
            className={cn(
              'transition-opacity duration-300 ease-in-out',
              hidden
                ? 'fixed -left-[9999px] top-0 w-[480px] h-[270px] opacity-0 pointer-events-none -z-50'
                : 'absolute inset-0 z-30 flex flex-col bg-black overflow-hidden opacity-100',
            )}
          >
            <div
              className={cn(
                'relative flex items-center justify-center bg-black overflow-hidden',
                hidden ? 'w-[480px] h-[270px]' : 'w-full h-full',
              )}
            >
              {!hidden && (
                <Btn
                  onClick={() => setHidden(true)}
                  aria-label={t('controls.closeVideo', 'Закрыть видеоплеер')}
                  title={t('controls.closeVideo', 'Закрыть видеоплеер')}
                  className="absolute top-4 right-4 z-40 p-2 rounded-lg bg-level-2/90 text-text-main backdrop-blur-md border border-white/20 transition-all cursor-pointer shadow-lg"
                >
                  <X className="size-5" />
                </Btn>
              )}

              {videoUrl && (
                <ReactPlayer
                  ref={setPlayerRef}
                  className="w-full h-full"
                  width="100%"
                  height="100%"
                  src={videoUrl}
                  url={videoUrl}
                  playing={feed.playing && playerMode === 'listen'}
                  volume={playerMode === 'control' ? 0 : (liveVolume ?? volume)}
                  playbackRate={playbackRate}
                  controls={false}
                  config={PLAYER_CONFIG}
                  onReady={handleReady}
                  onTimeUpdate={(e: any) => {
                    if (!seeking) {
                      const ps =
                        e.currentTarget?.currentTime ??
                        playerRef.current?.currentTime
                      if (
                        typeof ps === 'number' &&
                        !isNaN(ps) &&
                        isFinite(ps) &&
                        ps >= 0
                      ) {
                        setPlayedSeconds(ps)
                        const dur =
                          safeDuration > 0
                            ? safeDuration
                            : e.currentTarget?.duration || 1
                        setPlayed(Math.min(1, Math.max(0, ps / dur)))
                      }
                    }
                  }}
                  onDurationChange={(e: any) => {
                    const dur =
                      e.currentTarget?.duration ?? playerRef.current?.duration
                    if (typeof dur === 'number' && !isNaN(dur) && dur > 0) {
                      setDuration(dur)
                    }
                  }}
                  onLoadedMetadata={(e: any) => {
                    const dur =
                      e.currentTarget?.duration ?? playerRef.current?.duration
                    if (typeof dur === 'number' && !isNaN(dur) && dur > 0) {
                      setDuration(dur)
                    }
                  }}
                  onPlay={() => {
                    if (!feed.playing) feed.onPlayerStateChange(true)
                  }}
                  onPause={handlePause}
                  onEnded={handleEnd}
                  onProgress={({ played: p, playedSeconds: ps }: any) => {
                    if (!seeking) {
                      if (
                        typeof ps === 'number' &&
                        !isNaN(ps) &&
                        isFinite(ps) &&
                        ps >= 0
                      ) {
                        setPlayedSeconds(ps)
                        const dur = safeDuration > 0 ? safeDuration : 1
                        setPlayed(
                          typeof p === 'number' && !isNaN(p)
                            ? p
                            : Math.min(1, Math.max(0, ps / dur)),
                        )
                      }
                    }
                  }}
                  onDuration={(dur: number) => {
                    if (typeof dur === 'number' && !isNaN(dur) && dur > 0) {
                      setDuration(dur)
                    }
                  }}
                />
              )}
            </div>
          </div>,
          contentAreaEl,
        )}

      {/* Scrubber Progress Bar & Timestamps */}
      <div className="flex items-center gap-2 w-full px-1">
        <Slider
          value={[Math.min(1, Math.max(0, played))]}
          min={0}
          max={0.999999}
          step={0.0003}
          disabled={!feed.capabilities.canSeekArbitrary}
          onValueChange={([v]) => {
            setSeeking(true)
            setPlayed(v)
            const calculatedDuration = safeDuration || 1
            setPlayedSeconds(v * calculatedDuration)
          }}
          onValueCommit={handleSeekCommit}
          className="ring-text-main/20 ring-1 rounded-full flex-1 cursor-pointer"
        />
        <span className="text-[11px] text-text-secondary whitespace-nowrap tabular-nums font-mono">
          {formatTime(safePlayedSeconds)} /{' '}
          {formatTime(safeDuration > 1 ? safeDuration - 1 : safeDuration)}
        </span>
      </div>

      {/* Main Bar Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 items-center w-full gap-2 px-1">
        {/* Left: Track Information & Playlist Name */}
        <div className="flex items-center gap-3 min-w-0">
          {track && (
            <img
              src={thumbnailUrl}
              alt=""
              className="h-11 sm:h-12 aspect-video rounded-md object-cover shrink-0 border border-accent/30 shadow-xs"
            />
          )}
          <div className="min-w-0 flex flex-col flex-1 justify-center">
            <div className="flex items-center gap-1 min-w-0">
              {feed.feedId === 'single' ? (
                <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wider text-accent px-1.5 py-0.5 rounded bg-level-1 border border-accent/40 shrink-0">
                  {t('trackInfo.preview', 'Предпросмотр')}
                </span>
              ) : (
                playlist?.name && (
                  <span
                    className="inline-flex items-center text-[10px] font-semibold text-text-secondary px-1.5 py-0.5 rounded bg-level-1 border border-accent/20 shrink-0 max-w-[130px] truncate"
                    title={t('trackInfo.playlistTitle', 'Плейлист: {{name}}', {
                      name: playlist.name,
                    })}
                  >
                    {playlist.name}
                  </span>
                )
              )}
              {track?.requester_nickname && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-level-1 border border-accent/20 font-semibold text-text-secondary truncate shrink-0">
                  {t('trackInfo.order', 'Заказ: {{nickname}}', {
                    nickname: track.requester_nickname,
                  })}
                </span>
              )}
            </div>
            <span
              className="text-xs sm:text-sm text-text-main truncate font-semibold tracking-tight"
              title={track?.title}
            >
              {track?.title || t('trackInfo.noTrack', 'Нет трека')}
            </span>
            <div className="flex items-center gap-1.5 text-[11px] text-text-secondary truncate mt-0.5">
              <span className="truncate">
                {track?.author || track?.from_owner || 'OpenPlaylist'}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Playback Controls */}
        <div className="flex items-center justify-center gap-1.5 sm:gap-2">
          <Btn
            isActive={feed.shuffle}
            onClick={() => feed.setShuffle(!feed.shuffle)}
            aria-label={t('controls.shuffle', 'Случайный порядок')}
            title={t('controls.shuffle', 'Случайный порядок')}
            className={controBtnStyle}
          >
            <Shuffle className="size-4" />
          </Btn>

          {feed.capabilities.canSkip && (
            <Btn
              onClick={feed.prev}
              aria-label={t('controls.prev', 'Предыдущий трек')}
              title={t('controls.prev', 'Предыдущий трек')}
              className={controBtnStyle}
            >
              <SkipBack className="size-4" />
            </Btn>
          )}

          <Btn
            onClick={() => feed.onPlayerStateChange(!feed.playing)}
            aria-label={
              feed.playing
                ? t('controls.pause', 'Пауза')
                : t('controls.play', 'Воспроизведение')
            }
            title={
              feed.playing
                ? t('controls.pause', 'Пауза')
                : t('controls.play', 'Воспроизведение')
            }
            className={cn(controBtnStyle, 'size-11 sm:size-12')}
          >
            {feed.playing ? (
              <Pause className="size-5 sm:size-6" />
            ) : (
              <Play className="size-5 sm:size-6 ml-0.5" />
            )}
          </Btn>

          {feed.capabilities.canSkip && (
            <Btn
              onClick={feed.next}
              aria-label={t('controls.next', 'Следующий трек')}
              title={t('controls.next', 'Следующий трек')}
              className={controBtnStyle}
            >
              <SkipForward className="size-4" />
            </Btn>
          )}

          <Btn
            onClick={cycleRepeat}
            isActive={feed.repeatMode !== 'none'}
            aria-label={t('controls.repeatStatus', 'Повтор: {{mode}}', {
              mode:
                feed.repeatMode === 'all'
                  ? t('controls.repeatAll', 'Повторять все')
                  : feed.repeatMode === 'once'
                    ? t('controls.repeatOnce', 'Повторять один трек')
                    : t('controls.repeatOff', 'Без повтора'),
            })}
            title={
              feed.repeatMode === 'all'
                ? t('controls.repeatAll', 'Повторять все')
                : feed.repeatMode === 'once'
                  ? t('controls.repeatOnce', 'Повторять один трек')
                  : t('controls.repeatOff', 'Без повтора')
            }
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

        {/* Right: Volume, Video Toggle & Unified Options Popover */}
        <div className="flex items-center justify-end gap-2">
          {/* Volume Hover Control */}
          <HoverCard openDelay={0} closeDelay={200}>
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
                    ? t('controls.unmute', 'Включить звук')
                    : t('controls.mute', 'Выключить звук')
                }
                title={
                  volume === 0
                    ? t('controls.unmute', 'Включить звук')
                    : t('controls.mute', 'Выключить звук')
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
              side="top"
              className="w-fit bg-level-2 h-fit p-3 ring-1 ring-accent/40 border border-accent/30 rounded-lg shadow-xl"
            >
              <Slider
                className="w-24 ring-text-main/20 ring-1 rounded-full cursor-pointer"
                value={[liveVolume ?? volume]}
                min={0}
                max={1}
                step={0.01}
                onValueCommit={([v]) => setVolume(v)}
                onValueChange={([v]) => setLiveVolume(v)}
              />
            </HoverCardContent>
          </HoverCard>

          {/* Toggle Video Modal */}
          <Btn
            onClick={() => setHidden(!hidden)}
            isActive={!hidden}
            aria-label={t(
              'controls.toggleVideo',
              'Показать/скрыть видеоплеер',
            )}
            title={
              hidden
                ? t('controls.openVideo', 'Открыть видео')
                : t('controls.hideVideo', 'Скрыть видео')
            }
            className={controBtnStyle}
          >
            <MonitorPlay className="size-4" />
          </Btn>

          {/* Unified Player Options Popover (Mode, Channel, Widget, Speed, UpNext & Delete) */}
          <PlayerOptionsPopover
            feed={feed}
            playlistId={playlistId}
            currentTrackId={track?.id}
          />
        </div>
      </div>
    </div>
  )
}
