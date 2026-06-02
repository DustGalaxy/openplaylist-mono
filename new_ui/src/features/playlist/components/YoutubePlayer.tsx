/* eslint-disable import/no-duplicates */

import React, { useEffect } from 'react'
import YouTube from 'react-youtube'
import type { YouTubeEvent, YouTubePlayer, YouTubeProps } from 'react-youtube'
import useWindowDimensions from '@/hooks/useWindowDimensions'
import useMusicStore from '@/stores/musicStore'
import { usePlaylist } from '@/features/playlist/context/playlist-context'

type YoutubePlayerProps = {
  nowPlay: string | undefined
  pause: boolean
  playOnReady?: boolean
  className?: string
  
}

const YoutubePlayer: React.FC<YoutubePlayerProps> = ({
  nowPlay,
  pause,
  playOnReady = true,
  className = '',
  
}) => {
  const playlist = usePlaylist()
  const { height, width } = useWindowDimensions()
  const { playNext } = useMusicStore()
  const playerRef = React.useRef<YouTubePlayer>(null);

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
    if (pause) return
    playerRef.current.pauseVideo()
  }, [pause])

  const _onReady = async (event: YouTubeEvent<any>) => {
    playerRef.current = event.target
    if (!nowPlay || !playOnReady) return

    // const sleep = (ms: number) =>
    //   new Promise((resolve) => setTimeout(resolve, ms))

    // await sleep(50)
    event.target.playVideo()

    // event.target.seekTo(0)
  }

  return (
    <YouTube
      videoId={nowPlay || ''}
      className={className}
      opts={opts}
      id="player"
      onReady={_onReady}
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
