import React from 'react'
import DateChip from '@/components/ui/date-chip'
import Btn from '@/components/ui/my-btn'

import PriorityChip from '@/components/ui/priority-chip'

import Play from '@/components/icons/icon-play'
import Add from '@/components/icons/icon-add'
import Copy from '@/components/icons/icon-copy'
import Trash from '@/components/icons/icon-trash'
import Person from '@/components/icons/icon-person'
import DurationChip from '@/components/ui/duration-chip'
import Save from '@/components/icons/icon-save'

import type { Track } from '@/types/playlist'
import { usePlaylist } from '@/features/playlist/context/playlist-context'
import type { SavedTrack } from '@/stores/savedStore'
import { useMusicStore } from '@/stores/musicStore'
import { useSavedStore } from '@/stores/savedStore'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'

export default function OrderMiniCard({
  track,
  btns_type = 'playlist',
}: {
  track: Track | SavedTrack
  btns_type?: 'playlist' | 'non-playlist'
}) {
  const { t } = useTranslation()
  const playlist = usePlaylist()
  const bgUrl = `https://img.youtube.com/vi/${track.yt_video_id}/mqdefault.jpg`
  const [hovered, setHovered] = React.useState(false)
  const { requestPlayNow, requestAddTrack, requestRemoveTrack } = useMusicStore()
  const { isSaved, addTrack, removeTrack } = useSavedStore()

  const playlistButtons = [
    {
      icon: <Play />,
      on_click: () => {
        requestPlayNow(playlist.id, track.id)
      },
      className: 'px-1 bg-level-2',
      glow: 'white',
    },
    {
      icon: <Copy />,
        on_click: async () =>{
          await navigator.clipboard.writeText(
            'https://www.youtube.com/watch?v=' + track.yt_video_id,
          )
          toast.success(t('common.toast.copied'))
        },
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
      on_click: () => requestRemoveTrack(playlist.id, track.id, 'removed'),
      className: 'px-1 bg-level-2',
      glow: 'red',
    },
  ]

  const nonPlaylistButtons = [
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
      on_click: async () => {
        await requestAddTrack(
          playlist.id,
          'https://www.youtube.com/watch?v=' + track.yt_video_id,
        )
      },
      glow: 'white',
      className: 'px-1 bg-level-2',
    },
  ]

  const buttons =
    btns_type === 'playlist' ? playlistButtons : nonPlaylistButtons

  return (
    <div
      className={`
      rounded-(--rounded-std) 
      w-[300px] 
      md:w-[400px]
      overflow-hidden 
      group 
      transition-all 
      duration-400 
      ease-in-out 
      
      ${hovered ? 'max-h-64' : 'max-h-42 lg:max-h-30'} `}
    >
      {/*  */}
      <div className="relative w-full h-20">
        <div
          className=" rounded-(--rounded-std) gap-2 absolute inset-0 bg-cover bg-center blur-none"
          style={{
            backgroundImage: `url('${bgUrl}')`,
          }}
        >
          <div className="absolute inset-0 h-20 rounded-(--rounded-std) bg-black/55" />

          {/* title + requester */}
          <div className="px-2 pt-2 justify-between relative z-10 ">
            <div className="text-[18px] font-semibold text-left truncate">
              {track.title}
            </div>
            {btns_type === 'playlist' ? (
              <div className="text-[16px] text-[#888888] text-left flex items-center gap-1">
                <Person width={20} height={20} /> {track.requester_nickname}
              </div>
            ) : (
              <div className="h-5"></div>
            )}

            {/* date + priority + btn grid */}

            <div className="justify-between flex">
              <DurationChip time={+track.duration} />
              {btns_type === 'playlist' ? (
                <div className="flex gap-2">
                  <DateChip date={track.created_at} />
                  <PriorityChip number={+track.priority} />
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
      <div
        className={`${hovered ? 'lg:opacity-0' : 'lg:opacity-100'} 
        opacity-0
        delay-150 transition-opacity duration-200 ease-out 
        mt-7 mx-40 bg-white/20 rounded-(--rounded-std) h-1`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
      ></div>
      <div
        className={`
          ${hovered ? 'lg:opacity-100' : 'lg:opacity-0'} 
          opacity-100
          delay-150 transition-opacity duration-200 ease-out 
          flex gap-2 justify-center pb-4
          `}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
      >
        {buttons.map((btn, index) => (
          <Btn
            key={index}
            text={btn.icon}
            className={btn.className}
            onClick={btn.on_click}
          />
        ))}
        {/* {btns_type === 'playlist' && (
          <WarningModal
            playlist={playlist}
            yt_video_id={track.yt_video_id}
            requester_nickname={track.requester_nickname}
          />
        )} */}
      </div>
    </div>
  )
}
