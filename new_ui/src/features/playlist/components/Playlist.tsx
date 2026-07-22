import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CloudSync,
  Music2,
  PanelLeftClose,
  PanelLeftOpen,
  RadioTower,
  Share2 as ShareIcon,
  Shield,
  Terminal,
} from 'lucide-react'
import { toast } from 'sonner'
import OrderMiniCard from './order-mini-card'
import Counter from './order-counter'
import { PlaylistQueueInput } from './bar'
import SavedList from './saved-list'
import SortPanel from './sortPanel'
import LogPanel from './LogPanel'
import TrackCard from './TrackCard'
import PlayerBase from './PlayerControls'
import type { ClientPlaylist } from '@/types/playlist'
import Btn from '@/components/ui/my-btn'

import SettingsModal from '@/features/playlist-settings/components/playlist-settings/settingsModal'
import { changePlaylistActive } from '@/api/api-playlist'
import { useMusicStore } from '@/stores/musicStore'
import { useAppSettingsStore } from '@/stores/appSettingsStore'
import {
  filterTabActiveClass,
  filterTabBaseClass,
  filterTabInactiveClass,
  innerPanelClass,
  statusClosedClass,
  statusOpenClass,
} from '@/features/landing/styles'
import { cn } from '@/lib/utils'
import { Platform } from '@/types/playlist'
import {
  PlaylistProvider,
  usePlaylist,
} from '@/features/playlist/context/playlist-context'
import { InfoCardGroup } from '@/components/ui/info-card-group'
import { ReorderableList } from '@/components/dnd/ReorderableList'
import { ReorderRail } from '@/components/dnd/ReorderRail'
import { MiniCardDragGhost } from '@/components/dnd/DragGhost'
import { splitQueue } from '@/stores/musicStore/helpers'

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
  const moveMethod = useAppSettingsStore((s) => s.settings.moveMethod)
  const [toggled, setToggled] = React.useState(false)
  const [activePlst, setActivePlst] = React.useState(
    playlist.is_allow_external_requests,
  )
  const [queueSearch, setQueueSearch] = React.useState('')
  const { requestPlSettings, requestReorder, requestReorderStep } =
    useMusicStore()

  const visibleTracks = React.useMemo(() => {
    const q = queueSearch.trim().toLowerCase()

    const { vip, regular, background } = splitQueue(playlist)
    const combined = [
      vip.filter(
        (track) =>
          track.title.toLowerCase().includes(q) ||
          track.requester_nickname.toLowerCase().includes(q),
      ),
      regular.filter(
        (track) =>
          track.title.toLowerCase().includes(q) ||
          track.requester_nickname.toLowerCase().includes(q),
      ),
      background.filter(
        (track) =>
          track.title.toLowerCase().includes(q) ||
          track.requester_nickname.toLowerCase().includes(q),
      ),
    ]
    if (!q) return combined
    return combined
  }, [playlist, queueSearch])

  useEffect(() => {
    if (playlist.now_playing?.yt_video_id) {
      setNowPlaying(playlist.now_playing?.yt_video_id)
    }
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

  const controBtnStyle = 'p-1 rounded-sm size-8'

  return (
    <div className=" flex flex-col gap-3 ">
      <div className="w-full flex flex-col gap-4  items-end ">
        <div className={`flex flex-col gap-4 pt-3 pb-4 w-full rounded-md`}>
          <div className="flex flex-col gap-2 sm:gap-3  z-1">
            <div className="flex w-full gap-1 sm:gap-2 justify-between ">
              <div className="flex gap-1 sm:gap-2 justify-between w-full ">
                <div className="flex gap-1 sm:gap-2">
                  <Btn
                    title={t('playlist.tooltip.status')}
                    onClick={() => {
                      setActivePlst(!activePlst)
                      changePlaylistActive(playlist.id, activePlst)
                    }}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-1.5 py-1 sm:px-3 sm:py-1.5 text-sm font-mono rounded-sm',
                      activePlst ? statusOpenClass : statusClosedClass,
                    )}
                  >
                    <>
                      <span
                        className={`  h-1.5 w-1.5 rounded-full ${activePlst ? 'bg-emerald-400' : 'bg-text-placeholder'}`}
                        aria-hidden
                      />
                      {activePlst
                        ? t('playlist.status.online')
                        : t('playlist.status.offline')}
                    </>
                  </Btn>

                  <Btn
                    title={t('playlist.tooltip.sync')}
                    isActive={playlist.settings.sync_playback_position}
                    onClick={() => {
                      requestPlSettings(playlist.id, {
                        sync_playback_position:
                          !playlist.settings.sync_playback_position,
                      })
                    }}
                    className="size-8 rounded-sm"
                  >
                    <RadioTower className="size-5" />
                  </Btn>
                </div>

                <div className="flex gap-2">
                  <Btn
                    title={t('playlist.tooltip.share')}
                    className="p-1 bg-level-2 size-8 rounded-sm"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        window.location.origin + '/view?p=' + playlist.id,
                      )
                      toast.success(t('playlist.toast.linkCopied'))
                    }}
                  >
                    <ShareIcon className="size-5" />
                  </Btn>
                  <Btn
                    title={t('playlist.tooltip.logs')}
                    className="p-1 bg-level-2 size-8 rounded-sm"
                    onClick={() => {
                      if (showContentSettings) {
                        setShowContentSettings(false)
                      }
                      setShowConsole(!showConsole)
                    }}
                  >
                    <Terminal className="size-5" />
                  </Btn>
                  <Btn
                    title={t('playlist.tooltip.validation')}
                    className="p-1 bg-level-2 size-8 rounded-sm"
                    onClick={() => {
                      if (showConsole) {
                        setShowConsole(false)
                      }
                      setShowContentSettings(!showContentSettings)
                    }}
                  >
                    <Shield className="size-5" />
                  </Btn>
                </div>
              </div>
              <div className="flex gap-1 sm:gap-2">
                <div className="w-px h-[70%] self-center bg-text-secondary" />
                <SettingsModal />
              </div>
            </div>

            {(showConsole || showContentSettings) && (
              <div className={`h-full ring-1 ring-level-3 p-1 rounded-md`}>
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
                              onClick={() =>
                                setSelectedContentSettingIndex(index)
                              }
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
            )}
          </div>
        </div>

        {/* <div className="flex items-center  justify-center w-full mb-1 z-0">
          {playlist.now_playing?.yt_video_id ? (
            <TrackCard track={playlist.now_playing} type="now-playing" />
          ) : (
            <div
              className={`flex flex-col items-center justify-center gap-2 py-8 px-4   text-center w-full border-dashed ${innerPanelClass}`}
            >
              <Music2 className="h-8 w-8 text-text-main" strokeWidth={1.5} />
              <p className="text-sm text-text-secondary">
                {t('playlist.nowPlaying.empty')}
              </p>
            </div>
          )}
        </div> */}
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2">
        <div className="flex w-full min-w-0 gap-2 translate-y-1">
          <PlaylistQueueInput onSearchQueryChange={setQueueSearch} />
        </div>
        <div className="flex gap-2 shrink-0">
          <Btn
            className="px-2 bg-level-2 hidden sm:block"
            onClick={() => {
              setToggled(!toggled)
            }}
            title={
              toggled
                ? t('playlist.tooltip.hideSavedTracks')
                : t('playlist.tooltip.showSavedTracks')
            }
          >
            {toggled ? <PanelLeftClose /> : <PanelLeftOpen />}
          </Btn>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:justify-between">
        <SortPanel />
        <Counter
          number={playlist.track_data.length}
          className=" justify-self-center md:justify-self-end"
        />
      </div>

      <div className="flex w-full gap-2 sm:gap-4">
        {/* Saved section toggle */}

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

        {/* Playlist section */}

        <div className="w-full @container">
          <div
            className="w-full items-center flex-col 
            [@container_(width_<_600px)]:hidden
            [@container_(width_>=_600px)]:flex"
          >
            {playlist.track_data.length > 0 ? (
              visibleTracks.length > 0 ? (
                <div className="flex flex-col gap-4 w-full ">
                  {visibleTracks.map((group, i) => {
                    const groupName =
                      i === 0 ? 'vip' : i === 1 ? 'regular' : 'background'
                    const settings =
                      i === 0
                        ? playlist.settings.mode_settings[
                            playlist.settings.mode
                          ].sort_settings_vip
                        : i === 1
                          ? playlist.settings.mode_settings[
                              playlist.settings.mode
                            ].sort_settings_regular
                          : playlist.settings.mode_settings[
                              playlist.settings.mode
                            ].sort_settings_background
                    const active =
                      settings.order_mode === 'free' ||
                      groupName === 'background'

                    return group.length ? (
                      <div>
                        <div
                          className={`flex flex-col gap-4 relative w-full h-4 ${groupName === 'background' ? 'block' : 'hidden'}`}
                        >
                          <div className="absolute left-0 right-0 h-px bg-text-secondary" />
                          <div className="absolute left-1/2 transform -translate-x-1/2 text-text-secondary font-mono -translate-y-1/2 bg-level-1 px-4 rounded-full">
                            {groupName}
                          </div>
                        </div>
                        <ReorderableList
                          items={group}
                          orderedIds={group.map((t) => t.id)}
                          mode={moveMethod}
                          onReorder={(ids) => {
                            requestReorder(
                              playlist.id,
                              playlist.settings.mode,
                              groupName,
                              ids,
                            )
                          }}
                          onStep={() => {}}
                          renderItem={(track, isFirst, isLast, isDragging) => (
                            <ReorderRail
                              id={track.id}
                              mode={moveMethod}
                              isFirst={isFirst}
                              isLast={isLast}
                              isActive={active}
                              onMove={(dir) => {
                                requestReorderStep(
                                  playlist.id,
                                  groupName,
                                  track.id,
                                  dir,
                                )
                              }}
                            >
                              {() => (
                                <TrackCard
                                  track={track}
                                  type="playlist"
                                  isDragging={isDragging}
                                />
                              )}
                            </ReorderRail>
                          )}
                          renderGhost={(track) => (
                            <MiniCardDragGhost
                              title={track.title}
                              duration={track.duration}
                            />
                          )}
                        />{' '}
                      </div>
                    ) : (
                      <></>
                    )
                  })}
                </div>
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
                <div className="flex flex-col gap-4 w-full ">
                  {visibleTracks.map((group, i) => {
                    const groupName =
                      i === 0 ? 'vip' : i === 1 ? 'regular' : 'background'
                    const settings =
                      i === 0
                        ? playlist.settings.mode_settings[
                            playlist.settings.mode
                          ].sort_settings_vip
                        : i === 1
                          ? playlist.settings.mode_settings[
                              playlist.settings.mode
                            ].sort_settings_regular
                          : playlist.settings.mode_settings[
                              playlist.settings.mode
                            ].sort_settings_background
                    const active =
                      settings.order_mode === 'free' ||
                      groupName === 'background'

                    return group.length ? (
                      <div>
                        <div
                          className={`flex flex-col gap-4 relative w-full h-4 ${groupName === 'background' ? 'block' : 'hidden'}`}
                        >
                          <div className="absolute left-0 right-0 h-px bg-text-secondary" />
                          <div className="absolute left-1/2 transform -translate-x-1/2 text-text-secondary font-mono -translate-y-1/2 bg-level-1 px-4 rounded-full">
                            {groupName}
                          </div>
                        </div>
                        <ReorderableList
                          items={group}
                          orderedIds={group.map((t) => t.id)} // временно, пока free-режим не подключён к mode_settings
                          mode={moveMethod}
                          onReorder={(ids) => {
                            requestReorder(
                              playlist.id,
                              playlist.settings.mode,
                              groupName,
                              ids,
                            )
                          }} // заглушка на тест
                          onStep={() => {}}
                          renderItem={(track, isFirst, isLast, isDragging) => (
                            <ReorderRail
                              id={track.id}
                              mode={moveMethod}
                              isFirst={isFirst}
                              isLast={isLast}
                              isActive={active}
                              onMove={(dir) => {
                                requestReorderStep(
                                  playlist.id,
                                  groupName,
                                  track.id,
                                  dir,
                                )
                              }}
                            >
                              {() => (
                                <OrderMiniCard
                                  track={track}
                                  btns_type="playlist"
                                  isDragging={isDragging}
                                />
                              )}
                            </ReorderRail>
                          )}
                          renderGhost={(track) => (
                            <MiniCardDragGhost
                              title={track.title}
                              duration={track.duration}
                            />
                          )}
                        />{' '}
                      </div>
                    ) : (
                      <></>
                    )
                  })}
                </div>
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
function setNowPlaying(yt_video_id: string) {
  throw new Error('Function not implemented.')
}
