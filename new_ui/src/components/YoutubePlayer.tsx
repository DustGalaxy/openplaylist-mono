/* eslint-disable import/no-duplicates */
import React, { useContext, useEffect } from 'react'
import YouTube from 'react-youtube'
import type { YouTubeEvent, YouTubeProps } from 'react-youtube'
import type { ClientPlaylist } from '@/types/playlist'
import useWindowDimensions from '@/hooks/useWindowDimensions'
import useMusicStore from '@/stores/musicStore'

type YoutubePlayerProps = {
  playlist: ClientPlaylist
  nowPlay: string | undefined
  playOnReady?: boolean
  className?: string
}

const YoutubePlayer: React.FC<YoutubePlayerProps> = ({
  playlist,
  nowPlay,
  playOnReady = true,
  className = '',
}) => {
  const { height, width } = useWindowDimensions()
  const { playNext } = useMusicStore()

  const opts: YouTubeProps['opts'] = {
    height: width > 650 ? '360' : '180',
    width: width > 650 ? '640' : '310',
    playerVars: {
      autoplay: 1,
      start: 0,
      rel: 0,
      origin: 'http://localhost:3000',
    },
  }

  const _onReady = async (event: YouTubeEvent<any>) => {
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
        playNext(playlist)
      }}
    />
  )
}

export default YoutubePlayer
