/* eslint-disable import/no-duplicates */
import React, { useEffect, useRef, useCallback } from 'react'
import ReactPlayer from 'react-player'
import useWindowDimensions from '@/hooks/useWindowDimensions'
import useMusicStore from '@/stores/musicStore'
import { usePlaylist } from '@/features/playlist/context/playlist-context'
import { getPlaybackPositionStore } from '@/lib/playbackPosition'

type YoutubePlayerProps = {
  nowPlay: string | undefined
  pause: boolean
  setIsPaused: React.Dispatch<React.SetStateAction<boolean>>
  playOnReady?: boolean
  className?: string
}

const YoutubePlayer: React.FC<YoutubePlayerProps> = ({
  nowPlay,
  pause,
  setIsPaused,
  playOnReady = true,
  className = '',
}) => {
  const playlist = usePlaylist()
  const { height, width } = useWindowDimensions()
  const { playNext, setGetPlayerPosition, clearPausedBackground } =
    useMusicStore()

  const playerRef = useRef<HTMLVideoElement | null>(null)
  const isReadyRef = useRef(false)
  const pauseRef = useRef(pause)
  pauseRef.current = pause

  const playbackStore = getPlaybackPositionStore(
    playlist.settings.sync_playback_position,
  )

  const currentTrackRef = useRef(playlist.now_playing)
  currentTrackRef.current = playlist.now_playing

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
      .catch(() => { })
  }

  const isTabHiddenRef = useRef(false);

  useEffect(() => {
    const handleVisibilityChange = () => {
      isTabHiddenRef.current = document.hidden;
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    setGetPlayerPosition(() => playerRef.current?.currentTime ?? 0)
    return () => setGetPlayerPosition(null)
  }, [setGetPlayerPosition])

  useEffect(() => {
    const heartbeat = window.setInterval(() => {
      if (pauseRef.current) return
      savePosition()
    }, 10000)

    window.addEventListener('beforeunload', savePosition)
    return () => {
      window.clearInterval(heartbeat)
      window.removeEventListener('beforeunload', savePosition)
      savePosition()
    }
  }, [playlist.id, playlist.settings.sync_playback_position])

  const setPlayerRef = useCallback((player: HTMLVideoElement) => {
    if (!player) return
    playerRef.current = player
    playerRef.current.volume = 1
  }, [])

  const handlePlay = () => {
    if (!pause) return
    setIsPaused(false)
    savePosition()
  }

  const handlePause = () => {


    if (isTabHiddenRef.current) {
      console.log('Пауза проигнорирована: вкладка в фоне');
      return;
    }

    if (pause) return
    setIsPaused(true)
    savePosition()
  }

  const handleEnded = () => {
    if (playlist.settings.repeat_mode === 'once') {
      if (playerRef.current) {
        playerRef.current.currentTime = 0
        playerRef.current.play()
      }
      return
    }
    playNext(playlist, 'listened')
  }

  const handleReady = async () => {
    if (isReadyRef.current || !nowPlay || !playOnReady || !playerRef.current) return
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
      } catch { }
    }

    console.log("pos", pos)
    playerRef.current.currentTime = pos
  }

  // Сброс флага готовности при смене трека
  useEffect(() => {
    isReadyRef.current = false
  }, [nowPlay])

  const videoUrl = nowPlay ? `https://www.youtube.com/watch?v=${nowPlay}` : undefined
  const playerStyle = {
    width: width > 650 ? '640px' : '320px',
    height: width > 650 ? '360px' : '180px',
  }

  return (
    <div className={`${className} flex items-center w-full`}>
      <ReactPlayer
        ref={setPlayerRef}
        className="react-player"
        style={playerStyle}
        src={videoUrl}
        playing={!pause}
        controls={true}

        config={{
          youtube: {
            color: 'white'

          }
        }}

        onReady={handleReady}
        onPlay={handlePlay}
        onPause={handlePause}
        onEnded={handleEnded}
      />
    </div>
  )
}

export default YoutubePlayer