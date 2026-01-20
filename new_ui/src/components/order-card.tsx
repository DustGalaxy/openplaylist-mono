import React from 'react'
import DateChip from './ui/date-chip'
import Btn from './ui/my-btn'

import PriorityChip from './ui/priority-chip'

import Play from './icons/icon-play'
import Add from './icons/icon-add'
import Copy from './icons/icon-copy'
import Trash from './icons/icon-trash'
import Warning from './icons/icon-warning'

import Person from './icons/icon-person'
import Save from './icons/icon-save'
import WarningModal from './warningModal'
import type { ClientPlaylist, Track } from '@/types/playlist'
import { useMusicStore } from '@/stores/musicStore'
import { formatTime } from '@/lib/utils'
import { useSavedStore } from '@/stores/savedStore'

export default function OrderCard({
  track,
  playlist,
  btns_type = 'playlist',
}: {
  track: Track
  playlist: ClientPlaylist
  btns_type?: 'playlist' | 'non-playlist'
}) {
  const { requestPlayNow, requestRemoveTrack, requestPlSettings } =
    useMusicStore()
  const { isSaved, addTrack, removeTrack } = useSavedStore()
  const playlistButtons = [
    {
      icon: <Play />,
      on_click: () => requestPlayNow(track.playlist_id, track.id),
      className: 'px-1 bg-level-2',
      glow: 'white',
    },
    {
      icon: <Copy />,
      on_click: async () =>
        await navigator.clipboard.writeText(
          'https://www.youtube.com/watch?v=' + track.yt_video_id,
        ),
      className: 'px-1 bg-level-2',
      glow: 'white',
    },
    {
      icon: <Save fill={isSaved(track.yt_video_id) ? '#FFFFFF' : 'none'} />,
      on_click: () => {
        if (isSaved(track.yt_video_id)) {
          removeTrack(track.yt_video_id)
        } else {
          addTrack({
            yt_video_id: track.yt_video_id,
            title: track.title,
            duration: track.duration,
          })
        }
      },
      className: 'px-1 bg-level-2',
      glow: 'white',
    },
    {
      icon: <Trash />,
      on_click: () => requestRemoveTrack(track.playlist_id, track.id),
      className: 'px-1 bg-level-2',
      glow: 'red',
    },
  ]

  const nonPlaylistButtons = [
    {
      icon: <Play />,
      on_click: () => console.log('Play clicked'),
      glow: 'white',
      className: 'px-1 bg-level-2',
    },
    {
      icon: <Copy />,
      on_click: async () =>
        await navigator.clipboard.writeText(
          'https://www.youtube.com/watch?v=' + track.yt_video_id,
        ),
      glow: 'white',
      className: 'px-1 bg-level-2',
    },
    {
      icon: <Save fill={isSaved(track.yt_video_id) ? '#FFFFFF' : 'none'} />,
      on_click: () => {
        if (isSaved(track.yt_video_id)) {
          removeTrack(track.yt_video_id)
        } else {
          addTrack({
            yt_video_id: track.yt_video_id,
            title: track.title,
            duration: track.duration,
          })
        }
      },

      glow: 'white',
      className: 'px-1 bg-level-2',
    },
    {
      icon: <Add />,
      on_click: () => console.log('Add clicked'),
      glow: 'white',
      className: 'px-1 bg-level-2',
    },
  ]

  const buttons =
    btns_type === 'playlist' ? playlistButtons : nonPlaylistButtons

  return (
    <div
      className={`bg-level-2 rounded-(--rounded-std) h-[100px] min-w-[600px] w-full pr-2`}
    >
      {/* main grid */}

      <div className={`grid grid-cols-[150px_1fr] gap-2 h-[100px]  `}>
        <div className="h-[100px] w-full flex items-center justify-center">
          {/* img container */}
          <div className="relative h-[72px] block object-cover aspect-video rounded-(--rounded-std)">
            <img
              className="h-[72px] aspect-video rounded-(--rounded-std) block object-cover"
              src={
                'https://img.youtube.com/vi/' +
                track.yt_video_id +
                '/mqdefault.jpg'
              }
            />
            <div className="absolute text-[14px]  bottom-[3px] right-[3px] px-2 rounded-xl  bg-[#000000a7]">
              {formatTime(track.duration ? +track.duration : 0)}
            </div>
          </div>
        </div>

        {/* title + requester */}
        <div className="grid grid-rows-2 pt-2  w-full">
          <div className="text-[18px] font-semibold text-left truncate">
            {track.title}
          </div>
          <div className="text-[16px] text-[#888888] text-left flex gap-1 items-center">
            <Person width={20} height={20} /> {track.requester_nickname}
          </div>
          {/* date + priority + btn grid */}
          <div className={`relative mt-[14px] `}>
            <div className="flex justify-between ">
              <div className="flex gap-2 ">
                {buttons.map((btn, index) => (
                  <Btn
                    key={index}
                    text={btn.icon}
                    className={btn.className}
                    onClick={btn.on_click}
                  />
                ))}
                <WarningModal
                  playlist={playlist}
                  yt_video_id={track.yt_video_id}
                  requester_nickname={track.requester_nickname}
                />
              </div>
              <div className="flex gap-2">
                <DateChip date={track.created_at} />
                <PriorityChip number={+track.priority} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
