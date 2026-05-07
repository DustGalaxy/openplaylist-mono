import DateChip from '@/components/ui/date-chip'
import Btn from '@/components/ui/my-btn'
import PriorityChip from '@/components/ui/priority-chip'

import Add from '@/components/icons/icon-add'
import Copy from '@/components/icons/icon-copy'
import Warning from '@/components/icons/icon-warning'
import Person from '@/components/icons/icon-person'
import DurationChip from '@/components/ui/duration-chip'
import Save from '@/components/icons/icon-save'

import type { Track } from '@/types/playlist'
import { formatTime } from '@/lib/utils'

export default function PlayNowCard({ track }: { track: Track }) {
  const bgUrl = `https://img.youtube.com/vi/${track.yt_video_id}/mqdefault.jpg`

  const nonPlaylistButtons = [
    {
      icon: <Copy />,
      on_click: () => console.log('Copy clicked'),
      glow: 'white',
      className: 'px-1 bg-level-2',
    },
    {
      icon: <Save />,
      on_click: () => console.log('Save clicked'),
      glow: 'white',
      className: 'px-1 bg-level-2',
    },
    {
      icon: <Add />,
      on_click: () => console.log('Add clicked'),
      glow: 'white',
      className: 'px-1 bg-level-2',
    },
    {
      icon: <Warning />,
      on_click: () => console.log('Warning clicked'),
      glow: 'red',
      className: 'px-1 bg-level-2',
    },
  ]

  return (
    <div className="@container w-full ">
      <div
        className={`
          [@container_(width_>=_530px)]:hidden
          rounded-(--rounded-std) 
          w-full
          gap-2
          flex
          group 
          justify-center

          max-h-30`}
      >
        {/*  */}
        <div className="relative w-[300px] @md:w-[400px] h-20">
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
              <div className="text-[16px] text-[#888888] text-left flex items-center gap-1">
                <Person width={20} height={20} /> {track.requester_nickname}
              </div>

              {/* date + priority + btn grid */}
              <div className="justify-between flex">
                <DurationChip time={track.duration ? +track.duration : 0} />
                <div className="flex gap-2">
                  <DateChip date={track.created_at || ''} />
                  <PriorityChip number={track.priority} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          className={`
         
          grid grid-cols-2
           gap-2 justify-center pb-4
          `}
        >
          {nonPlaylistButtons.map((btn, index) => (
            <Btn
              key={index}
              text={btn.icon}
              className={btn.className}
              onClick={btn.on_click}
            />
          ))}
        </div>
      </div>

      <div
        className={`  h-[120px] min-w-[530px] w-full pr-2 hidden [@container_(width_>=_530px)]:block`}
      >
        {/* main grid */}

        <div
          className={`grid bg-level-2 rounded-(--rounded-std) grid-cols-[150px_1fr] gap-2 h-[100px]  `}
        >
          <div className="h-[100px] w-full flex items-center justify-center">
            {/* img container */}
            <div className="relative h-[72px] block object-cover aspect-video rounded-(--rounded-std)">
              <img
                className="h-[72px] aspect-video rounded-(--rounded-std) block object-cover"
                src={bgUrl}
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
                  {nonPlaylistButtons.map((btn, index) => (
                    <Btn
                      key={index}
                      text={btn.icon}
                      className={btn.className}
                      onClick={btn.on_click}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <DateChip date={track.created_at || ''} />
                  <PriorityChip number={track.priority} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
