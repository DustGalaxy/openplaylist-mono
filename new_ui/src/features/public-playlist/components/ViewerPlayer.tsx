import React, { useCallback, useEffect, useRef } from 'react'
import ReactPlayer from 'react-player'
import useWindowDimensions from '@/hooks/useWindowDimensions'

type SeekSignal = { position: number; token: number } | null

type ViewerPlayerProps = {
  nowPlay: string | undefined
  playing: boolean
  seekSignal: SeekSignal
  onPlayerStateChange: (playing: boolean) => void
  onEnded: () => void
  registerPositionGetter: (getter: () => number) => void
  className?: string
}

// Вынесено из компонента — новый объект на каждый рендер заставлял
// react-player пересоздавать плеер, отсюда лаги/дёрганья.
const YOUTUBE_PLAYER_CONFIG = { youtube: { color: 'white' } }

const ViewerPlayer: React.FC<ViewerPlayerProps> = ({
  nowPlay,
  playing,
  seekSignal,
  onPlayerStateChange,
  onEnded,
  registerPositionGetter,
  className = '',
}) => {
  const { width } = useWindowDimensions()
  const playerRef = useRef<HTMLVideoElement | null>(null)
  const isReadyRef = useRef(false)
  const lastSeekTokenRef = useRef<number | null>(null)

  const isTabHiddenRef = useRef(false);

  useEffect(() => {
    const handleVisibilityChange = () => {
      isTabHiddenRef.current = document.hidden;
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    registerPositionGetter(() => playerRef.current?.currentTime ?? 0)
    return () => registerPositionGetter(() => 0)
  }, [registerPositionGetter])

  useEffect(() => {
    isReadyRef.current = false
  }, [nowPlay])

  // Ресинк по внешнему сигналу (resync/переключение трека) — точечный,
  // не полит каждую секунду, поэтому не грузит рендер.
  useEffect(() => {
    if (!seekSignal || seekSignal.token === lastSeekTokenRef.current) return
    lastSeekTokenRef.current = seekSignal.token
    if (playerRef.current) playerRef.current.currentTime = seekSignal.position
    console.log("seekSignal 67");

  }, [seekSignal])

  const setPlayerRef = useCallback((player: HTMLVideoElement) => {
    if (!player) return
    playerRef.current = player
    playerRef.current.volume = 0.5
  }, [])

  const handleReady = () => {
    if (isReadyRef.current || !nowPlay || !playerRef.current) return
    isReadyRef.current = true
    if (seekSignal) playerRef.current.currentTime = seekSignal.position
  }

  const videoUrl = nowPlay ? `https://www.youtube.com/watch?v=${nowPlay}` : undefined
  const playerStyle = {
    width: width > 650 ? '640px' : '320px',
    height: width > 650 ? '360px' : '180px',
  }

  return (
    <div className={`${className} flex items-center w-full justify-center`} hidden={!videoUrl}>
      <ReactPlayer
        ref={setPlayerRef}
        className="react-player"
        style={playerStyle}
        src={videoUrl}

        playing={playing}
        autoPlay={true}
        controls
        config={YOUTUBE_PLAYER_CONFIG}
        onReady={handleReady}
        onPlay={() => onPlayerStateChange(true)}
        onPause={() => {
          if (isTabHiddenRef.current) {
            console.log('Пауза проигнорирована: вкладка в фоне');
            return;
          }
          onPlayerStateChange(false)
        }}
        onEnded={onEnded}
      />
    </div>
  )
}

export default ViewerPlayer