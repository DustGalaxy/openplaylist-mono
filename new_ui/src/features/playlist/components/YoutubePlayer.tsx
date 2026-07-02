/* eslint-disable import/no-duplicates */

import React, { useEffect, useRef } from 'react'
import YouTube from 'react-youtube'
import type { YouTubeEvent, YouTubePlayer, YouTubeProps } from 'react-youtube'
import useWindowDimensions from '@/hooks/useWindowDimensions'
import useMusicStore from '@/stores/musicStore'
import { usePlaylist } from '@/features/playlist/context/playlist-context'
import { getPlaybackPositionStore } from '@/lib/playbackPosition'


enum NextReason {
  skip = "skip",
  breakPriority = "breakPriority",
}

type EventNext = {
  yt_id: string
  reason: NextReason
}

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
  const playerRef = React.useRef<YouTubePlayer>(null)

  const playbackStore = getPlaybackPositionStore(
    playlist.settings.sync_playback_position,
  )
  // Держим актуальный ID плейлиста/трека в ref, чтобы heartbeat/unmount-save
  // не пересоздавали интервал/обработчик на каждый ре-рендер компонента.
  const currentTrackRef = useRef(playlist.now_playing)
  currentTrackRef.current = playlist.now_playing

  const savePosition = () => {
    const track = currentTrackRef.current
    const seconds = playerRef.current?.getCurrentTime()
    if (!track || seconds === undefined) return
    playbackStore
      .save(playlist.id, {
        track_id: track.id,
        position_seconds: seconds,
        updated_at: new Date().toISOString(),
      })
      .catch(() => {
        // Бэкенд ещё не готов (см. backendPlaybackPositionStore) либо
        // localStorage недоступен — reload-resume в этом случае просто
        // не сработает, не роняем воспроизведение из-за этого.
      })
  }

  const opts: YouTubeProps['opts'] = {
    height: width > 650 ? '360' : '180',
    width: width > 650 ? '640' : '310',
    playerVars: {
      autoplay: 1,
      start: 0,
      rel: 0,
      origin: window.location.origin,
    },
  }



  useEffect(() => {
    if (!playerRef.current) return
    if (pause) {
      playerRef.current.pauseVideo()
      savePosition()
    } else {
      playerRef.current.playVideo()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pause])

  // Мост к стору: даём musicStore возможность спросить текущую позицию
  // плеера в момент VIP-прерывания (см. syncAddTrack). Живёт только пока
  // этот конкретный YoutubePlayer смонтирован.
  useEffect(() => {
    setGetPlayerPosition(() => playerRef.current?.getCurrentTime() ?? 0)
    return () => setGetPlayerPosition(null)
  }, [setGetPlayerPosition])

  // Reload-resume: периодически сохраняем позицию, пока трек играет, плюс
  // на размонтирование/закрытие вкладки — чтобы пережить перезагрузку
  // страницы. Не путать с paused_background (VIP-прерывание) — это
  // независимая система, применяется к любому текущему треку.
  useEffect(() => {
    const heartbeat = window.setInterval(savePosition, 5000)

    window.addEventListener('beforeunload', savePosition)
    return () => {
      window.clearInterval(heartbeat)
      window.removeEventListener('beforeunload', savePosition)
      savePosition()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlist.id, playlist.settings.sync_playback_position])

  const _onReady = async (event: YouTubeEvent<any>) => {
    playerRef.current = event.target
    if (!nowPlay || !playOnReady) return

    // Резюм прерванного фонового трека: если то, что должно заиграть —
    // это ровно тот трек, который мы придержали при VIP-прерывании,
    // продолжаем с сохранённой позиции вместо старта с начала.
    const paused = playlist.paused_background
    if (paused && paused.track_id === playlist.now_playing?.id) {
      event.target.seekTo(paused.position_seconds, true)
      clearPausedBackground(playlist.id)
    } else if (playlist.now_playing) {
      // Иначе — обычный reload-resume: если для этого конкретного трека
      // есть сохранённая позиция (пережившая перезагрузку страницы),
      // продолжаем с неё.
      try {
        const saved = await playbackStore.load(playlist.id)
        if (saved && saved.track_id === playlist.now_playing.id) {
          event.target.seekTo(saved.position_seconds, true)
        }
      } catch {
        // нет сохранённой позиции либо бэкенд недоступен — играем с начала
      }
    }

    event.target.playVideo()
    event.target.playVideo()
  }

  return (
    <YouTube

      videoId={nowPlay || ''}

      className={className + " "}
      opts={opts}
      id="player"
      onReady={_onReady}
      onPause={() => setIsPaused(true)}
      onPlay={() => setIsPaused(false)}
      // onStateChange={async (e) => {
      //   if (e.data === YouTube.PlayerState.CUED) {
      //     if (!nowPlay || !playOnReady) return

      //     const sleep = (ms: number) =>
      //       new Promise((resolve) => setTimeout(resolve, ms))

      //     await sleep(50)
      //     e.target.playVideo()
      //     e.target.seekTo(0)
      //   }
      // }}
      onEnd={(event) => {
        if (playlist.settings.repeat_mode === 'once') {
          event.target.playVideo()
          // event.target.seekTo(0)
          return
        }
        playNext(playlist, 'listened')
      }}
    />
  )
}

export default YoutubePlayer