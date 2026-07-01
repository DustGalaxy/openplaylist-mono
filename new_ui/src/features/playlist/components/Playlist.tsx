import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Music2,
  PanelLeftClose,
  PanelLeftOpen,
  Pause,
  Play,
  Repeat,
  Repeat1,
  RepeatOff,
  Share2 as ShareIcon,
  Shield,
  Shuffle,
  SkipBack,
  SkipForward,
} from 'lucide-react'
import { toast } from 'sonner'
import OrderMiniCard from './order-mini-card'
import YoutubePlayer from './YoutubePlayer'
import Counter from './order-counter'
import { PlaylistQueueInput } from './bar'
import SavedList from './saved-list'
import SortPanel from './sortPanel'
import LogPanel from './LogPanel'
import TrackCard from './TrackCard'
import type { ClientPlaylist, SortSettings } from '@/types/playlist'
import Btn from '@/components/ui/my-btn'

import SettingsModal from '@/features/settings/components/playlist-settings/settingsModal'
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
import { useDebouncedEffect } from '@/hooks/useDeboucedEffect'
import { InfoCardGroup } from '@/components/ui/info-card-group'

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
  const [sortSettings, setSortSettings] = React.useState<SortSettings>(
    playlist.settings.sort_settings,
  )
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

  const canRequest = React.useRef(false)

  useDebouncedEffect(
    sortSettings,
    async () => {
      if (!canRequest.current) return
      canRequest.current = false
      await requestPlSettings(playlist.id, { sort_settings: sortSettings })
    },
    2000,
  )

  const updateSettings = (newSettings: SortSettings) => {
    setSortSettings(newSettings)
    playlist.settings.sort_settings = newSettings
    canRequest.current = true
  }

  const [showConsole, setShowConsole] = React.useState(false)
  const [showContentSettings, setShowContentSettings] = React.useState(false)
  const [selectedContentSettingIndex, setSelectedContentSettingIndex] =
    React.useState(0)
  const contentSettings =
    playlist.settings.content_settings[selectedContentSettingIndex]

  return (
    <div className="w-full flex flex-col gap-3">
      <div className="w-full flex flex-col gap-4  items-end ">
        <div
          className={`flex flex-col gap-4  px-3 pt-3 pb-4 ${panelClass} w-full`}
        >
          <div className="grid grid-cols-2 gap-2 sm:gap-3  z-1">
            <YoutubePlayer
              playOnReady={true}
              pause={isPaused}
              setIsPaused={setIsPaused}
              nowPlay={nowPlaying}
              className={`sm:row-span-2 ${showConsole || showContentSettings ? '' : 'col-span-2'} flex items-center justify-center`}
            />
            {showConsole && <LogPanel />}

            {showContentSettings && (
              <div className="flex flex-col gap-2 sm:gap-3">
                <div className={`flex items-center justify-between`}>
                  <div className="flex gap-2 flex-wrap">
                    {playlist.settings.content_settings.map(
                      (setting, index) => (
                        <button
                          key={setting.platform}
                          type="button"
                          onClick={() => setSelectedContentSettingIndex(index)}
                          className={`${filterTabBaseClass} ${selectedContentSettingIndex === index
                            ? filterTabActiveClass
                            : filterTabInactiveClass
                            }`}
                        >
                          {setting.platform === Platform.General
                            ? t('common.general')
                            : setting.platform}
                        </button>
                      ),
                    )}
                  </div>
                </div>

                <InfoCardGroup
                  mode={playlist.settings.mode}
                  min_views={contentSettings.min_views}
                  min_likes={contentSettings.min_likes}
                  max_duration={contentSettings.max_duration}
                  track_cooldown={contentSettings.track_cooldown}
                  user_cooldown={contentSettings.user_cooldown}
                  max_playlist_size={playlist.settings.max_playlist_size}
                  priorityMode={playlist.settings.cost_mode}
                  className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-px sm:gap-0.5"
                />
              </div>
            )}
          </div>

          <div className="  grid  sm:grid-cols-2 w-full gap-2">
            <div className="w-full gap-2 grid grid-cols-5  ">
              <Btn
                text={
                  repeatMode === 'all' ? (
                    <Repeat />
                  ) : repeatMode === 'once' ? (
                    <Repeat1 />
                  ) : (
                    <RepeatOff />
                  )
                }
                title={t(`playlist.tooltip.repeatMode.${repeatMode}`)}
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
              {
                <Btn
                  title={t(`playlist.tooltip.prev`)}
                  text={<SkipBack />}
                  disabled={playlist.settings.mode !== 'static'}
                  className={`px-2 bg-level-2 `}
                  onClick={() => {
                    playPrev(playlist.id)
                  }}
                />
              }
              <Btn
                title={t(`playlist.tooltip.${isPaused ? 'play' : 'pause'}`)}
                text={isPaused ? <Play /> : <Pause />}
                className="px-2 bg-level-2"
                onClick={() => {
                  isPaused ? setIsPaused(false) : setIsPaused(true)
                }}
              />
              <Btn
                title={t(`playlist.tooltip.next`)}
                text={<SkipForward />}
                className="px-2 bg-level-2"
                onClick={() => {
                  playNext(playlist, 'skipped')
                }}
              />

              <Btn
                title={t(`playlist.tooltip.shuffle`)}
                text={<Shuffle />}
                isActive={sortSettings.shuffle !== 'none'}
                onClick={() =>
                  updateSettings({
                    ...sortSettings,
                    shuffle: sortSettings.shuffle === 'none' ? 'desc' : 'none',
                  })
                }
                className="px-5"
              />
            </div>

            <div className="flex gap-2  justify-between ">
              <div className="w-px h-[70%] self-center bg-text-secondary" />
              <div className="flex w-full  gap-2 justify-between ">
                <div className="flex gap-2 justify-between w-full ">
                  <Btn
                    title={t('playlist.tooltip.status')}
                    text={
                      <>
                        <span
                          className={`  h-1.5 w-1.5 rounded-full ${activePlst ? 'bg-emerald-400' : 'bg-text-placeholder'}`}
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
                      'inline-flex items-center gap-1.5  px-3 py-1.5 text-sm font-mono min-h-11',
                      activePlst ? statusOpenClass : statusClosedClass,
                    )}
                  />
                  <div className="flex gap-2">
                    <Btn
                      text={<ShareIcon />}
                      title={t('playlist.tooltip.share')}
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
                      title={t('playlist.tooltip.logs')}
                      className="px-3.25 bg-level-2 font-bold font-mono"
                      onClick={() => {
                        if (showContentSettings) {
                          setShowContentSettings(false)
                        }
                        setShowConsole(!showConsole)
                      }}
                    />
                    <Btn
                      text={<Shield />}
                      title={t('playlist.tooltip.validation')}
                      className="px-3 bg-level-2"
                      onClick={() => {
                        if (showConsole) {
                          setShowConsole(false)
                        }
                        setShowContentSettings(!showContentSettings)
                      }}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="w-px h-[70%] self-center bg-text-secondary" />
                  <SettingsModal />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center  justify-center w-full mb-1 z-0">
          {playlist.now_playing?.yt_video_id ? (
            <TrackCard track={playlist.now_playing} type="now-playing" />
          ) : (
            <div
              className={`flex flex-col items-center justify-center gap-2 py-8 px-4   text-center w-full border-dashed ${innerPanelClass}`}
            >
              <Music2
                className="h-8 w-8 text-text-main"
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
        <div className="flex w-full min-w-0 gap-2 translate-y-1">
          <PlaylistQueueInput onSearchQueryChange={setQueueSearch} />
        </div>
        <div className="flex gap-2 shrink-0">
          <SortPanel />
          <Btn
            text={toggled ? <PanelLeftClose /> : <PanelLeftOpen />}
            className="px-2 bg-level-2 hidden sm:block"
            onClick={() => {
              setToggled(!toggled)
            }}
            title={
              toggled
                ? t('playlist.tooltip.hideSavedTracks')
                : t('playlist.tooltip.showSavedTracks')
            }
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
            className="w-full items-center flex-col gap-y-2 sm:gap-y-4
            [@container_(width_<_600px)]:hidden
            [@container_(width_>=_600px)]:flex"
          >
            {playlist.track_data.length > 0 ? (
              visibleTracks.length > 0 ? (
                visibleTracks.map((track) => (
                  <TrackCard key={track.id} track={track} type="playlist" />
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
