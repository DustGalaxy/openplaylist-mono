import React, { useEffect } from 'react'
import {
  Clock,
  Eye,
  List,
  RefreshCcw,
  Settings,
  ThumbsUp,
  User,
} from 'lucide-react'
import OrderCard from './order-card'
import OrderMiniCard from './order-mini-card'
import Btn from './ui/my-btn'
import LeftPanel from './icons/icon-left-panel'
import RightPanel from './icons/icon-right-panel'
import YoutubePlayer from './YoutubePlayer'
import Next from './icons/icon-next'
import RepeatLined from './icons/icon-repeat-lined'
import RepeatSingle from './icons/icon-repeat-single'
import Priority from './icons/icon-priority'
import Repeat from './icons/icon-repeat'
import PlayNowCard from './playnow-card'
import Counter from './order-counter'
import { ExpandingInputButtons } from './bar'

import SettingsModal from './settingsModal'
import SavedList from './saved-list'
import SortPanel from './sortPanel'
import type { ClientPlaylist } from '@/types/playlist'
import { changePlaylistActive } from '@/api/api-playlist'

import { useMusicStore } from '@/stores/musicStore'

const InfoCard = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
}) => {
  return (
    <div className="bg-level-2 rounded-(--rounded-std) p-2 md:p3 flex flex-col items-center gap-1 text-center">
      <div className="text-gray-400 flex items-center gap-1">
        {icon}
        <div className="text-xs text-gray-400">{label}</div>
      </div>

      <div className="text-sm font-semibold">{value}</div>
    </div>
  )
}

export default function Playlist({ playlist }: { playlist: ClientPlaylist }) {
  const [tracks, setTracks] = React.useState([1, 2, 3, 4, 5]) // Example tracks array
  const [loading, setLoading] = React.useState(true)

  const [toggled, setToggled] = React.useState(false)
  const [activePlst, setActivePlst] = React.useState(
    playlist.settings.is_active,
  )

  const [repeatMode, setRepeatMode] = React.useState(
    playlist.settings.repeat_mode,
  )

  const [nowPlaying, setNowPlaying] = React.useState<string | undefined>(
    playlist.now_playing?.yt_video_id,
  )

  const { playNext, requestPlSettings } = useMusicStore()

  useEffect(() => {
    setNowPlaying(playlist.now_playing?.yt_video_id)
  }, [playlist])

  return (
    <div className="w-full ">
      <div
        className="w-full grid gap-2 grid-cols-1 [@media_(min-width:1150px)]:grid-cols-[640px_1fr] 
      grid-rows-[auto_auto_auto] [@media_(min-width:640px)]:grid-rows-2 
         "
      >
        <YoutubePlayer
          playlist={playlist}
          playOnReady={playlist.settings.is_active}
          nowPlay={nowPlaying}
          className="[@media_(min-width:640px)]:row-span-2 flex items-center justify-center "
        />

        <div className="w-full gap-4 grid ">
          <div className="grid grid-cols-3 md:grid-cols-4 gap-2 md:gap-4 ">
            <InfoCard
              icon={<Settings size={16} />}
              label="Mode"
              value={playlist.settings.mode}
            />
            <InfoCard
              icon={<Eye size={16} />}
              label="Min views"
              value={playlist.settings.min_views}
            />
            <InfoCard
              icon={<ThumbsUp size={16} />}
              label="Min likes"
              value={playlist.settings.min_likes}
            />
            <InfoCard
              icon={<Clock size={16} />}
              label="Max duration"
              value={`${playlist.settings.max_duration} sec`}
            />
            <InfoCard
              icon={<RefreshCcw size={16} />}
              label="Track CD"
              value={`${playlist.settings.track_cooldown}m`}
            />
            <InfoCard
              icon={<User size={16} />}
              label="User CD"
              value={`${playlist.settings.user_cooldown}m`}
            />
            <InfoCard
              icon={<List size={16} />}
              label="Max size"
              value={playlist.settings.max_playlist_size || '∞'}
            />
            <InfoCard
              icon={<Priority width={16} height={16} />}
              label="Priority mode"
              value={playlist.settings.cost_mode}
            />
          </div>

          <div className="flex gap-2 justify-between items-end">
            {/* <ModesBar playlist={playlist} /> */}
            <div className="flex gap-2">
              <Btn
                text={
                  <div className="flex gap-1 justify-center w-25 items-center">
                    <div
                      className={`${activePlst ? 'bg-green-600 shadow-green-600' : 'bg-red-600 shadow-red-600'} 
                    shadow-[0px_0px_10px] w-2 h-2 rounded-full `}
                    />{' '}
                    {activePlst ? 'ACTIVE' : 'INACTIVE'}
                  </div>
                }
                className={`px-4 py-1  bg-level-2`}
                onClick={() => {
                  setActivePlst(!activePlst)
                  changePlaylistActive(playlist.name, activePlst)
                  console.log('Button clicked, activePlst:', !toggled)
                }}
              />
            </div>
            <div className="flex gap-2  [@media_(min-width:600px)]:justify-end">
              <Btn
                text={
                  repeatMode === 'all' ? (
                    <Repeat width={33} height={33} />
                  ) : repeatMode === 'once' ? (
                    <RepeatSingle width={33} height={33} />
                  ) : (
                    <RepeatLined width={33} height={33} />
                  )
                }
                className="px-2 bg-level-2"
                onClick={() => {
                  if (repeatMode === 'all') {
                    setRepeatMode('once')
                    requestPlSettings(playlist.name, { repeat_mode: 'once' })
                  } else if (repeatMode === 'once') {
                    setRepeatMode('none')
                    requestPlSettings(playlist.name, { repeat_mode: 'none' })
                    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                  } else if (repeatMode === 'none') {
                    setRepeatMode('all')
                    requestPlSettings(playlist.name, { repeat_mode: 'all' })
                  }
                }}
              />
              {playlist.settings.mode === 'static' && (
                <Btn
                  text={<Next width={33} height={33} className=" rotate-180" />}
                  className="px-2 bg-level-2"
                  onClick={() => {}}
                />
              )}
              <Btn
                text={<Next width={33} height={33} />}
                className="px-2 bg-level-2"
                onClick={() => {
                  console.log('Button clicked, Next clicked')
                  playNext(playlist)
                }}
              />

              <SettingsModal playlist={playlist} />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center py-2">
          {playlist.now_playing && playlist.now_playing.yt_video_id ? (
            <PlayNowCard track={playlist.now_playing} />
          ) : (
            <div>
              <p className="text-gray-500">No track is currently playing.</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-2 py-2">
        <div className="flex w-full gap-2">
          <ExpandingInputButtons playlist={playlist} />
        </div>
        <div className="flex gap-2">
          <Counter number={playlist.track_data.length} />
          <SortPanel playlist={playlist} />
          <Btn
            text={toggled ? <RightPanel /> : <LeftPanel />}
            className="px-2 bg-level-2"
            onClick={() => {
              setToggled(!toggled)
              console.log('Button clicked, toggled:', !toggled)
            }}
          />
        </div>
      </div>

      <div className="flex w-full">
        <div className={` w-full  ${toggled ? 'block' : 'hidden'}`}>
          <div className="w-full  text-3xl flex items-center justify-center pb-2">
            Saved
          </div>
          <div className="w-full @container">
            <div
              className="w-full  items-center flex-col gap-y-8 
              [@container_(width_<_600px)]:hidden 
              [@container_(width_>=_600px)]:flex"
            >
              <SavedList playlist={playlist} />
            </div>

            <div
              className="w-full  items-center flex-col gap-y-8 
              [@container_(width_<_600px)]:flex 
              [@container_(width_>=_600px)]:hidden"
            >
              <SavedList playlist={playlist} />
            </div>
          </div>
        </div>

        <div className=" w-full  @container">
          <div className="w-full  text-3xl flex items-center justify-center pb-2">
            Track list
          </div>

          <div
            className="w-full  items-center flex-col gap-y-8 
            [@container_(width_<_600px)]:hidden 
            [@container_(width_>=_600px)]:flex"
          >
            {playlist.track_data.length > 0 ? (
              playlist.track_data.map((track, index) => (
                <OrderCard
                  key={index}
                  track={
                    playlist.track_data.filter((t) => t.id === track.id)[0]
                  }
                  playlist={playlist}
                  btns_type="playlist"
                />
              ))
            ) : (
              <p className="text-gray-500">No tracks available.</p>
            )}
          </div>
          <div
            className="w-full  items-center flex-col gap-y-8 
            [@container_(width_<_600px)]:flex 
            [@container_(width_>=_600px)]:hidden"
          >
            {playlist.track_data.length > 0 ? (
              playlist.track_data.map((track, index) => (
                <OrderMiniCard
                  key={index}
                  track={
                    playlist.track_data.filter((t) => t.id === track.id)[0]
                  }
                  playlist={playlist}
                  btns_type="playlist"
                />
              ))
            ) : (
              <p className="text-gray-500">No tracks available.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
