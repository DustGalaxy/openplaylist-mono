import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Clock,
  Eye,
  List,
  Music2,
  Pause,
  Play,
  RefreshCcw,
  Settings,
  Shield,
  Share2 as ShareIcon,
  ThumbsUp,
  User,
} from 'lucide-react'
import { toast } from 'sonner'
import OrderCard from './order-card'
import OrderMiniCard from './order-mini-card'
import Btn from '@/components/ui/my-btn'
import LeftPanel from '@/components/icons/icon-left-panel'
import RightPanel from '@/components/icons/icon-right-panel'
import YoutubePlayer from './YoutubePlayer'
import Next from '@/components/icons/icon-next'
import RepeatLined from '@/components/icons/icon-repeat-lined'
import RepeatSingle from '@/components/icons/icon-repeat-single'
import Priority from '@/components/icons/icon-priority'
import Repeat from '@/components/icons/icon-repeat'
import PlayNowCard from './playnow-card'
import Counter from './order-counter'
import { PlaylistQueueInput } from './bar'

import SettingsModal from '@/features/settings/components/playlist-settings/settingsModal'
import SavedList from './saved-list'
import SortPanel from './sortPanel'
import type { ClientPlaylist } from '@/types/playlist'
import { changePlaylistActive } from '@/api/api-playlist'
import { useMusicStore } from '@/stores/musicStore'
import {
  filterTabActiveClass,
  filterTabBaseClass,
  filterTabInactiveClass,
  innerPanelClass,
  panelClass,
  statusClosedClass,
  statusOpenClass,
} from '@/features/landing/styles'
import { cn } from '@/lib/utils'
import { Platform } from '@/types/playlist'
import {
  PlaylistProvider,
  usePlaylist,
} from '@/features/playlist/context/playlist-context'
import LogPanel from './LogPanel'

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string | number
}) {
  return (
    <div
      className={`${innerPanelClass} p-3 sm:p-4 flex flex-col gap-2 transition-colors hover:border-level-3/30`}
    >
      <div className="flex items-center gap-2 text-text-placeholder">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-level-2/80 text-level-3">
          {icon}
        </span>
        <span className="text-[11px] uppercase tracking-wide leading-tight">
          {label}
        </span>
      </div>
      <p className="text-base font-semibold text-text-main pl-9 sm:pl-0 sm:text-center sm:-mt-1">
        {value}
      </p>
    </div>
  )
}

export default function Playlist({ playlist }: { playlist: ClientPlaylist }) {
  return (
    <PlaylistProvider playlist={playlist}>
      <PlaylistView />
    </PlaylistProvider>
  )
}

function PlaylistView() {
  const { t } = useTranslation()
  const playlist = usePlaylist()
  const [toggled, setToggled] = React.useState(false)
  const [activePlst, setActivePlst] = React.useState(
    playlist.is_allow_external_requests,
  )
  const [nowPlaying, setNowPlaying] = React.useState<string | undefined>(
    playlist.now_playing?.yt_video_id,
  )
  const [repeatMode, setRepeatMode] = React.useState(
    playlist.settings.repeat_mode,
  )

  const [queueSearch, setQueueSearch] = React.useState('')

  const [isPaused, setIsPaused] = React.useState(false)

  const { playNext, requestPlSettings, playPrev } = useMusicStore()

  const visibleTracks = React.useMemo(() => {
    const q = queueSearch.trim().toLowerCase()
    if (!q) return playlist.track_data
    return playlist.track_data.filter(
      (track) =>
        track.title.toLowerCase().includes(q) ||
        track.requester_nickname.toLowerCase().includes(q),
    )
  }, [playlist.track_data, queueSearch])

  useEffect(() => {
    setNowPlaying(playlist.now_playing?.yt_video_id)
  }, [playlist])

  useEffect(() => {
    setActivePlst(playlist.is_allow_external_requests)
  }, [playlist.is_allow_external_requests])

  const [showConsole, setShowConsole] = React.useState(false)
  const [showContentSettings, setShowContentSettings] = React.useState(false)
  const [selectedContentSettingIndex, setSelectedContentSettingIndex] =
    React.useState(0)
  const contentSettings =
    playlist.settings.content_settings[selectedContentSettingIndex]

  return (
    <div className="w-full flex flex-col gap-3">
      <div className="w-full grid gap-4 grid-cols-1  grid-rows-[auto_auto_auto] ">
        <YoutubePlayer
          playOnReady={true}
          pause={isPaused}
          nowPlay={nowPlaying}
          className="sm:row-span-2 flex items-center justify-center"
        />

        <div className={`w-full gap-4 grid p-4 sm:p-6 ${panelClass}`}>
          {showConsole && <LogPanel />}

          {showContentSettings && (
            <div className="flex flex-col gap-2 sm:gap-3">
              <div className={`flex items-center justify-between`}>
                <div className="flex gap-2 flex-wrap">
                  {playlist.settings.content_settings.map((setting, index) => (
                    <button
                      key={setting.platform}
                      type="button"
                      onClick={() => setSelectedContentSettingIndex(index)}
                      className={`${filterTabBaseClass} ${
                        selectedContentSettingIndex === index
                          ? filterTabActiveClass
                          : filterTabInactiveClass
                      }`}
                    >
                      {setting.platform === Platform.General
                        ? t('common.general')
                        : setting.platform}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                <InfoCard
                  icon={<Settings size={14} />}
                  label={t('playlist.stats.mode')}
                  value={playlist.settings.mode}
                />
                <InfoCard
                  icon={<Eye size={14} />}
                  label={t('playlist.stats.minViews')}
                  value={contentSettings.min_views}
                />
                <InfoCard
                  icon={<ThumbsUp size={14} />}
                  label={t('playlist.stats.minLikes')}
                  value={contentSettings.min_likes}
                />
                <InfoCard
                  icon={<Clock size={14} />}
                  label={t('playlist.stats.maxDuration')}
                  value={t('playlist.stats.durationSec', {
                    count: contentSettings.max_duration,
                  })}
                />
                <InfoCard
                  icon={<RefreshCcw size={14} />}
                  label={t('playlist.stats.trackCd')}
                  value={t('playlist.stats.cooldownMin', {
                    count: contentSettings.track_cooldown,
                  })}
                />
                <InfoCard
                  icon={<User size={14} />}
                  label={t('playlist.stats.userCd')}
                  value={t('playlist.stats.cooldownMin', {
                    count: contentSettings.user_cooldown,
                  })}
                />
                <InfoCard
                  icon={<List size={14} />}
                  label={t('playlist.stats.maxSize')}
                  value={
                    playlist.settings.max_playlist_size ||
                    t('playlist.stats.maxSizeUnlimited')
                  }
                />
                <InfoCard
                  icon={<Priority width={14} height={14} />}
                  label={t('playlist.stats.priorityMode')}
                  value={playlist.settings.cost_mode}
                />
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-4 justify-between items-center">
            <div className="flex flex-wrap w-full sm:w-fit gap-2 justify-between sm:justify-start">
              <div className="flex gap-2">
                <Btn
                  text={<ShareIcon />}
                  className="px-3 bg-level-2"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      window.location.origin + '/view?p=' + playlist.id,
                    )
                    toast.success(t('playlist.toast.linkCopied'))
                  }}
                />
                <Btn
                  text={'>_'}
                  className="px-3.25 bg-level-2 font-bold font-mono"
                  onClick={() => {
                    setShowConsole(!showConsole)
                  }}
                />
                <Btn
                  text={<Shield  />}
                  className="px-3 bg-level-2"
                  onClick={() => {
                    setShowContentSettings(!showContentSettings)
                  }}
                />
              </div>

              <Btn
                text={
                  <>
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${activePlst ? 'bg-emerald-400' : 'bg-text-placeholder'}`}
                      aria-hidden
                    />
                    {activePlst
                      ? t('playlist.status.online')
                      : t('playlist.status.offline')}
                  </>
                }
                onClick={() => {
                  setActivePlst(!activePlst)
                  changePlaylistActive(playlist.id, activePlst)
                }}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium min-h-11',
                  activePlst ? statusOpenClass : statusClosedClass,
                )}
              />
            </div>
            <div className="flex flex-wrap w-full sm:w-fit gap-2 justify-between sm:justify-end">
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
                    requestPlSettings(playlist.id, { repeat_mode: 'once' })
                  } else if (repeatMode === 'once') {
                    setRepeatMode('none')
                    requestPlSettings(playlist.id, { repeat_mode: 'none' })
                    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                  } else if (repeatMode === 'none') {
                    setRepeatMode('all')
                    requestPlSettings(playlist.id, { repeat_mode: 'all' })
                  }
                }}
              />
              {playlist.settings.mode === 'static' && (
                <Btn
                  text={<Next width={33} height={33} className=" rotate-180" />}
                  className="px-2 bg-level-2"
                  onClick={() => {
                    playPrev(playlist.id)
                  }}
                />
              )}
              <Btn
                text={
                  isPaused ? (
                    <Play width={33} height={33} />
                  ) : (
                    <Pause width={33} height={33} />
                  )
                }
                className="px-2 bg-level-2"
                onClick={() => {
                  isPaused ? setIsPaused(false) : setIsPaused(true)
                }}
              />
              <Btn
                text={<Next width={33} height={33} />}
                className="px-2 bg-level-2"
                onClick={() => {
                  playNext(playlist, 'skipped')
                }}
              />
              <SettingsModal />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center py-2">
          {playlist.now_playing?.yt_video_id ? (
            <PlayNowCard track={playlist.now_playing} />
          ) : (
            <div
              className={`flex flex-col items-center justify-center gap-2 py-8 px-4 text-center w-full border-dashed ${innerPanelClass}`}
            >
              <Music2
                className="h-8 w-8 text-text-placeholder"
                strokeWidth={1.5}
              />
              <p className="text-sm text-text-secondary">
                {t('playlist.nowPlaying.empty')}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2">
        <div className="flex w-full min-w-0 gap-2">
          <PlaylistQueueInput onSearchQueryChange={setQueueSearch} />
        </div>
        <div className="flex gap-2 shrink-0">
          <SortPanel />
          <Btn
            text={toggled ? <RightPanel /> : <LeftPanel />}
            className="px-2 bg-level-2 hidden sm:block"
            onClick={() => {
              setToggled(!toggled)
            }}
          />
        </div>
      </div>
      <div className="flex justify-end">
        <Counter number={playlist.track_data.length} />
      </div>

      <div className="flex w-full gap-2 sm:gap-4">
        <div className={`w-full ${toggled ? 'block' : 'hidden'}`}>
          <div className="w-full text-lg font-semibold text-text-main flex items-center justify-center pb-2">
            {t('playlist.saved.title')}
          </div>
          <div className="w-full @container">
            <div
              className="w-full items-center flex-col gap-y-4 sm:gap-y-8
              [@container_(width_<_600px)]:hidden
              [@container_(width_>=_600px)]:flex"
            >
              <SavedList />
            </div>

            <div
              className="w-full items-center flex-col gap-y-4 sm:gap-y-8
              [@container_(width_<_600px)]:flex
              [@container_(width_>=_600px)]:hidden"
            >
              <SavedList />
            </div>
          </div>
        </div>

        <div className="w-full @container">
          <div
            className="w-full items-center flex-col gap-y-4 sm:gap-y-8
            [@container_(width_<_600px)]:hidden
            [@container_(width_>=_600px)]:flex"
          >
            {playlist.track_data.length > 0 ? (
              visibleTracks.length > 0 ? (
                visibleTracks.map((track) => (
                  <OrderCard
                    key={track.id}
                    track={track}
                    btns_type="playlist"
                  />
                ))
              ) : (
                <p className="text-sm text-text-secondary py-8 text-center w-full">
                  {t('playlist.queue.noMatch')}
                </p>
              )
            ) : (
              <p className="text-sm text-text-secondary py-8 text-center w-full">
                {t('playlist.queue.empty')}
              </p>
            )}
          </div>
          <div
            className="w-full items-center flex-col gap-y-4 sm:gap-y-8
            [@container_(width_<_600px)]:flex
            [@container_(width_>=_600px)]:hidden"
          >
            {playlist.track_data.length > 0 ? (
              visibleTracks.length > 0 ? (
                visibleTracks.map((track) => (
                  <OrderMiniCard
                    key={track.id}
                    track={track}
                    btns_type="playlist"
                  />
                ))
              ) : (
                <p className="text-sm text-text-secondary py-8 text-center w-full">
                  {t('playlist.queue.noMatch')}
                </p>
              )
            ) : (
              <p className="text-sm text-text-secondary py-8 text-center w-full">
                {t('playlist.queue.empty')}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
