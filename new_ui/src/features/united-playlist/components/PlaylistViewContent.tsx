// src/features/playlist/components/PlaylistViewContent.tsx
import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  Bell,
  Music2,
  PanelLeftClose,
  PanelLeftOpen,
  Radio,
  RadioOff,
  RadioTower,
  Share2,
  Shield,
  Terminal,
} from 'lucide-react'
import {
  PlaylistViewProvider,
  usePlaylistView,
} from '../context/playlist-view-context'
import SortPanel from './sortPanel'
import QueueList from './QueueList'
import SavedList from './saved-list'
import LogPanel from './LogPanel'
import { PlaylistQueueInput } from './bar'
import type { SlotId } from '@/types/playlist'
import { usePlaylistStore } from '@/stores/playlistStore'
import { cn } from '@/lib/utils'
import Btn from '@/components/ui/my-btn'
import SettingsModal from '@/features/playlist-settings/components/settingsModal'
import { SubscriptionCreateModal } from '@/features/notifications/components/SubscriptionCreateModal'
import SearchPlaylist from '@/features/united-playlist/components/search-playlist'
import { InfoCardGroup } from '@/components/ui/info-card-group'
import { Platform } from '@/types/playlist'
import { createSubscription } from '@/api/api-user'
import {
  filterTabActiveClass,
  filterTabBaseClass,
  filterTabInactiveClass,
} from '@/features/landing/styles'
import UserPopover from '@/features/user-profile/components/UserPopover'
import { useFeatureTranslation } from '@/lib/i18n/featureTranslation'
import { FeatureLock } from '@/features/feature-gate'
import BulkClearModal from '@/features/united-playlist/components/modals/BulkClearModal'

export default function PlaylistViewContent({ slot }: { slot: SlotId }) {
  return (
    <PlaylistViewProvider slot={slot}>
      <PlaylistViewInner />
    </PlaylistViewProvider>
  )
}

function PlaylistViewInner() {
  const { t: tc } = useTranslation()
  const { t } = useFeatureTranslation()
  const { slot, playlist, playlistId, role, isLoading, owner } =
    usePlaylistView()
  const { toggleExternalRequests, toggleBroadcast, setAcceptSync } =
    usePlaylistStore()

  const acceptSync = usePlaylistStore((s) =>
    playlistId ? s.cache[playlistId]?.local.acceptSync : false,
  )

  const [toggled, setToggled] = React.useState(false)
  const [showConsole, setShowConsole] = React.useState(false)
  const [showContentSettings, setShowContentSettings] = React.useState(false)
  const [selectedContentSettingIndex, setSelectedContentSettingIndex] =
    React.useState(0)
  const [openNewSubModal, setOpenNewSubModal] = React.useState(false)

  if (!playlistId) {
    // viewer, nothing loaded yet — search screen
    return (
      <div className="flex flex-col gap-6 items-center text-center py-12">
        <p className="text-text-secondary">{t('publicView.searchTitle')}</p>
        <SearchPlaylist />
      </div>
    )
  }

  if (isLoading || !playlist) {
    return (
      <div className="py-12 text-center text-text-secondary">
        {tc('common.loading')}
      </div>
    )
  }

  const isOwnerLike = role === 'owner' || role === 'operator'
  const isViewerLike = role === 'viewer'
  const contentSettings = playlist.content_settings[selectedContentSettingIndex]

  const copyLink = () => {
    navigator.clipboard.writeText(
      `${window.location.origin}/playlists/${playlist.id}`,
    )
    toast.success(t('playlist.toast.linkCopied'))
  }

  const handleCreateSubscription = async (settings: any) => {
    await createSubscription(playlist.id, 'playlist', playlist.name, settings)
    setOpenNewSubModal(false)
  }

  return (
    <div className="flex flex-col gap-3 mt-2">
      {/* header actions */}
      <div className="flex flex-col gap-4 w-full rounded-md">
        <div className="flex w-full gap-1 sm:gap-2 justify-between items-center">
          <div className="flex gap-2">
            {isOwnerLike && (
              <>
                <Btn
                  title={t('playlist.tooltip.status')}
                  onClick={() =>
                    toggleExternalRequests(
                      playlist.id,
                      playlist.is_allow_external_requests,
                    )
                  }
                  className={cn(
                    'inline-flex items-center gap-1.5 px-1.5 py-1 sm:px-3 sm:py-1.5 text-sm font-mono rounded-sm bg-level-2 ',
                    playlist.is_allow_external_requests
                      ? ' text-emerald-500'
                      : ' text-text-secondary',
                  )}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${playlist.is_allow_external_requests ? 'bg-emerald-400' : 'bg-text-placeholder'}`}
                  />
                  {playlist.is_allow_external_requests
                    ? t('playlist.status.online')
                    : t('playlist.status.offline')}
                </Btn>
                <FeatureLock featureKey="sync_playback_position">
                  <div className="flex items-center justify-between">
                    <Btn
                      title={t('playlist.tooltip.sync')}
                      isActive={playlist.sync_playback_position}
                      onClick={() =>
                        toggleBroadcast(
                          playlist.id,
                          !playlist.sync_playback_position,
                        )
                      }
                      className="size-8 rounded-sm"
                    >
                      <RadioTower className="size-5" />
                    </Btn>
                  </div>
                </FeatureLock>
              </>
            )}
            {isViewerLike && (
              <div className="flex flex-col ">
                <div className="text-text-main ">{playlist.name}</div>
                <div className="text-text-secondary text-xs">
                  {playlist.description || 'No discription'}
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-2 items-center">
            <Btn
              title={t('playlist.tooltip.share')}
              className="p-1 bg-level-2 size-8 rounded-sm"
              onClick={copyLink}
            >
              <Share2 className="size-5" />
            </Btn>
            {isViewerLike && (
              <>
                <Btn
                  title={t('publicView.subscribe')}
                  className="p-1 bg-level-2 size-8 rounded-sm"
                  onClick={() => setOpenNewSubModal(true)}
                >
                  <Bell className="size-5" />
                </Btn>
                <Btn
                  onClick={() => setAcceptSync(playlist.id, !acceptSync)}
                  className="p-1 bg-level-2 size-8 rounded-sm relative"
                  title={t('publicView.sync')}
                  disabled={!playlist.sync_playback_position}
                >
                  {acceptSync ? (
                    <RadioOff className="size-5" />
                  ) : (
                    <Radio className="size-5" />
                  )}
                </Btn>
              </>
            )}
            <Btn
              title={t('playlist.tooltip.validation')}
              className="p-1 bg-level-2 size-8 rounded-sm"
              onClick={() => {
                setShowConsole(false)
                setShowContentSettings(!showContentSettings)
              }}
            >
              <Shield className="size-5" />
            </Btn>
            {isOwnerLike && (
              <>
                <Btn
                  title={t('playlist.tooltip.logs')}
                  className="p-1 bg-level-2 size-8 rounded-sm"
                  onClick={() => {
                    setShowContentSettings(false)
                    setShowConsole(!showConsole)
                  }}
                >
                  <Terminal className="size-5" />
                </Btn>
                <BulkClearModal />
                <SettingsModal />
              </>
            )}
            {isViewerLike && (
              <div className="-mt-0.5">
                <UserPopover user={owner}></UserPopover>
              </div>
            )}
          </div>
        </div>

        {(showConsole || showContentSettings) && (
          <div className="h-full ring-1 ring-level-3 p-1 rounded-md">
            {showConsole && isOwnerLike && <LogPanel />}
            {showContentSettings && (
              <div className="flex flex-col gap-2 sm:gap-3">
                <div className="flex gap-2 flex-wrap">
                  {playlist.content_settings.map((setting, index) => (
                    <button
                      key={setting.platform}
                      type="button"
                      onClick={() => setSelectedContentSettingIndex(index)}
                      className={cn(
                        filterTabBaseClass,
                        selectedContentSettingIndex === index
                          ? filterTabActiveClass
                          : filterTabInactiveClass,
                      )}
                    >
                      {setting.platform === Platform.General
                        ? tc('common.general')
                        : setting.platform}
                    </button>
                  ))}
                </div>
                {contentSettings && (
                  <InfoCardGroup
                    mode={playlist.mode}
                    min_views={contentSettings.min_views}
                    min_likes={contentSettings.min_likes}
                    max_duration={contentSettings.max_duration}
                    track_cooldown={contentSettings.track_cooldown}
                    user_cooldown={contentSettings.user_cooldown}
                    max_playlist_size={playlist.max_playlist_size}
                    priorityMode={playlist.cost_mode}
                    className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-px sm:gap-0.5"
                  />
                )}
              </div>
            )}
          </div>
        )}
      </div>
      <div>
        <PlaylistQueueInput />
      </div>
      <div className="flex flex-col md:flex-row md:justify-between">
        <SortPanel />
      </div>

      <div className="flex w-full gap-2 sm:gap-4">
        {isOwnerLike && (
          <div className={toggled ? 'block' : 'hidden'}>
            <Btn
              className="px-2 bg-level-2"
              onClick={() => setToggled(!toggled)}
              title={
                toggled
                  ? t('playlist.tooltip.hideSavedTracks')
                  : t('playlist.tooltip.showSavedTracks')
              }
            >
              {toggled ? <PanelLeftClose /> : <PanelLeftOpen />}
            </Btn>
            <SavedList />
          </div>
        )}

        <div className="w-full">
          <QueueList />
        </div>
      </div>

      {isViewerLike && (
        <SubscriptionCreateModal
          isOpen={openNewSubModal}
          targetName={playlist.name}
          targetType="playlist"
          onCreate={handleCreateSubscription}
          onClose={() => setOpenNewSubModal(false)}
        />
      )}
    </div>
  )
}
