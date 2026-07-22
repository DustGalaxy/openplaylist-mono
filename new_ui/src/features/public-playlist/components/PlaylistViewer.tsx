import {
  Bell,
  Calendar,
  Link,
  ListMusic,
  Pause,
  Play,
  Radio,
  RadioOff,
  RadioTower,
  Repeat,
  Repeat1,
  RepeatOff,
  Route,
  Share2,
  Shield,
  Shuffle,
  SkipBack,
  SkipForward,
} from 'lucide-react'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLoaderData, useSearch } from '@tanstack/react-router'
import { useViewerPlayback } from '../hooks/useViewerPlayback'
import SearchPlaylist from './search-playlist'
import ViewerPlayer from './ViewerPlayer'
import ViewerQueuePanel from './ViewerQueuePanel'
import ViewInfoBar from './ViewInfoBar'
import type { SubscriptionSettings } from '@/features/notifications/types'
import { PlaylistProvider } from '@/features/playlist/context/playlist-context'
import { Platform, type ClientPlaylist, type Track } from '@/types/playlist'
import { toast } from 'sonner'
import { createSubscription } from '@/api/api-user'
import { getPlsUpdsSocket } from '@/api/io-sockets'
import Btn from '@/components/ui/my-btn'
import {
  filterTabActiveClass,
  filterTabBaseClass,
  filterTabInactiveClass,
  gradientTextClass,
  pageInnerClass,
  pageWrapClass,
  panelClass,
  sectionTitleClass,
} from '@/features/landing/styles'
import { SubscriptionCreateModal } from '@/features/notifications/components/SubscriptionCreateModal'
import { computePriority } from '@/lib/utils'
import { InfoCardGroup } from '@/components/ui/info-card-group'

function ViewPageShell({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  const { t } = useTranslation()
  return (
    <div className={pageWrapClass}>
      <div className={pageInnerClass}>
        <header className="text-center mb-8 sm:mb-10">
          <p
            className={`inline-flex items-center gap-2 text-sm font-medium mb-3 ${gradientTextClass}`}
          >
            <Radio className="h-4 w-4 text-(--color-accent-2)" />
            {t('publicView.eyebrow')}
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-main mb-2">
            {title}
          </h1>
          <p className="text-text-secondary max-w-xl mx-auto text-sm sm:text-base">
            {subtitle}
          </p>
        </header>
        {children}
      </div>
    </div>
  )
}

const PlaylistViewer = ({
  playlist,
  playlistIdFromUrl,
}: {
  playlist: ClientPlaylist | null
  playlistIdFromUrl: string | null
}) => {
  const { t, i18n } = useTranslation()

  const [playlistState, setPlaylistState] = useState<ClientPlaylist | null>(
    playlist,
  )
  const viewer = useViewerPlayback(playlistState)

  const [openNewSubModal, setOpenNewSubModal] = useState(false)
  const [showContentSettings, setShowContentSettings] = useState(false)
  const [selectedContentSettingIndex, setSelectedContentSettingIndex] =
    React.useState(0)
  const contentSettings =
    playlist?.settings.content_settings[selectedContentSettingIndex]

  useEffect(() => {
    console.log('playlist was upadted = ', playlist)

    if (playlist) {
      playlist.track_data = playlist.track_data.map((track) => {
        return { ...track, priority: computePriority(track, playlist.settings) }
      })
    }
    setPlaylistState(playlist)
  }, [playlist])

  useEffect(() => {
    const plst_upds_socket = getPlsUpdsSocket()
    const handleConnect = () => {
      if (playlist?.id) {
        plst_upds_socket.emit('subscribe', { playlist_id: playlist.id })
      }
    }

    plst_upds_socket.on('connect', handleConnect)

    if (plst_upds_socket.connected) {
      handleConnect()
    }

    return () => {
      plst_upds_socket.off('connect', handleConnect)
    }
  }, [playlist?.id])

  useEffect(() => {
    if (!playlist) return
    const plst_upds_socket = getPlsUpdsSocket()

    plst_upds_socket.on('add_track:' + playlist.id, (payload: unknown) => {
      setPlaylistState((prevState) => {
        if (!prevState) return prevState
        const parsed =
          payload && typeof payload === 'string' ? JSON.parse(payload) : payload
        if (!parsed) return prevState
        return {
          ...prevState,
          track_data: [...prevState.track_data, parsed],
        } as ClientPlaylist
      })
    })

    plst_upds_socket.on('playnow:' + playlist.id, (payload: unknown) => {
      setPlaylistState((prevState) => {
        if (!prevState) return prevState
        const parsed =
          payload && typeof payload === 'string' ? JSON.parse(payload) : payload
        if (!parsed) return prevState
        const tr: Track | null =
          prevState.track_data.find((t) => t.id === parsed.track_id) || null

        return {
          ...prevState,
          now_playing: tr,
        } as ClientPlaylist
      })
    })

    plst_upds_socket.on(
      'delete_track:' + playlist.id,
      (payload: { track_id: string }) => {
        setPlaylistState((prevState) => {
          if (!prevState) return prevState
          return {
            ...prevState,
            track_data: prevState.track_data.filter(
              (t) => t.id !== payload.track_id,
            ),
          } as ClientPlaylist
        })
      },
    )

    plst_upds_socket.on(
      'settings_changed:' + playlist.id,
      (payload: unknown) => {
        setPlaylistState((prevState) => {
          if (!prevState) return prevState
          const parsed =
            payload && typeof payload === 'string'
              ? JSON.parse(payload)
              : payload
          if (!parsed) return prevState
          return {
            ...prevState,
            settings: parsed,
          }
        })
      },
    )

    plst_upds_socket.on('kicked_from_playlist', () => {
      window.location.href = '/view'
    })

    return () => {
      plst_upds_socket.emit('unsubscribe', { playlist_id: playlist.id })
      plst_upds_socket.off('add_track:' + playlist.id)
      plst_upds_socket.off('playnow:' + playlist.id)
      plst_upds_socket.off('delete_track:' + playlist.id)
      plst_upds_socket.off('settings_changed:' + playlist.id)
      plst_upds_socket.off('kicked_from_playlist')
    }
  }, [playlist])

  if (!playlist || playlistState === null) {
    return (
      <ViewPageShell
        title={t('publicView.searchTitle')}
        subtitle={t('publicView.browseSubtitle')}
      >
        {playlistIdFromUrl && (
          <div
            className={`mb-6 p-4 text-center text-sm ${panelClass} border-dashed border-level-3/60`}
          >
            <p className="text-text-main font-medium mb-1">
              {t('publicView.notFoundUnavailable')}
            </p>
            <p className="text-text-secondary">
              {t('publicView.notFoundCheckLink')}
            </p>
          </div>
        )}
        <div className={`p-6 sm:p-10 ${panelClass}`}></div>
      </ViewPageShell>
    )
  }

  const handleCreateSubscription = async (settings: SubscriptionSettings) => {
    await createSubscription(playlistState.id, 'playlist', settings)

    setOpenNewSubModal(false)
    toast.success(t('notifications.subscribed', 'Subscribed!'))
  }

  const requestsOpen = playlist.is_allow_external_requests
  const updatedLabel = new Date(playlist.updated_at).toLocaleDateString(
    i18n.language === 'ru' ? 'ru-RU' : 'en-US',
    { day: 'numeric', month: 'long', year: 'numeric' },
  )
  return (
    <div className={`text-text-main w-full`}>
      <div className={`${pageInnerClass} flex flex-col gap-4`}>
        {/* Search — compact */}
        <section className={`p-5 sm:p-6 ${panelClass}`}>
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-text-placeholder mb-1">
                {t('publicView.anotherPlaylist')}
              </p>
              <h2 className="text-lg font-semibold text-text-main">
                {t('publicView.searchPublic')}
              </h2>
            </div>
            <Link
              to="/view"
              search={{ p: undefined }}
              className="text-sm text-level-3 hover:text-text-main transition-colors shrink-0"
            >
              {t('publicView.resetSearchAgain')}
            </Link>
          </div>
          <SearchPlaylist />
        </section>

        {/* Playlist detail */}
        <section className={`relative overflow-hidden  `}>
          <header className="relative flex items-start gap-4">
            <div
              className="
                flex h-12 w-12 shrink-0 items-center justify-center rounded-(--rounded-std)
                bg-linear-to-br from-accent-2/20 via-accent-3/20 to-accent-1/20
                border border-white/10 text-level-3
              "
            >
              <ListMusic className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex flex-col flex-1 gap-2 ">
              <div className="flex flex-row justify-between">
                <h1 className="text-2xl sm:text-3xl font-bold text-text-main leading-tight wrap-break-word">
                  {playlistState.name}
                </h1>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2">
                  <Btn
                    title={t('publicView.copyLink')}
                    className="p-1 bg-level-2 size-8 rounded-sm"
                    onClick={() => {
                      const url = new URL(window.location.href)
                      url.searchParams.set('p', playlistState.id)
                      navigator.clipboard.writeText(url.toString())
                      toast.success(
                        t(
                          'playlist.toast.linkCopied',
                          'link copied to clipboard',
                        ),
                      )
                    }}
                  >
                    <Share2 className="size-5" />
                  </Btn>
                  <Btn
                    onClick={() => setOpenNewSubModal(true)}
                    title={t('publicView.subscribe')}
                    className="p-1 bg-level-2 size-8 rounded-sm"
                  >
                    <Bell className="size-5" />
                  </Btn>
                  <Btn
                    title={t('playlist.tooltip.validation')}
                    className="p-1 bg-level-2 size-8 rounded-sm"
                    onClick={() => {
                      setShowContentSettings(!showContentSettings)
                    }}
                  >
                    <Shield className="size-5" />
                  </Btn>
                  <Btn
                    disabled={!viewer.canSync || viewer.syncing}
                    onClick={() =>
                      viewer.mode === 'synced' ? viewer.desync() : viewer.sync()
                    }
                    className="p-1 bg-level-2 size-8 rounded-sm relative"
                  >
                    {viewer.mode === 'synced' ? (
                      <RadioOff className={`size-5 `} />
                    ) : (
                      <Radio className={`size-5 `} />
                    )}

                    <div
                      className={`h-1 w-4 rounded-full absolute bottom-0.5 ${
                        !viewer.canSync
                          ? 'bg-text-secondary'
                          : viewer.mode === 'synced'
                            ? 'bg-emerald-500'
                            : 'bg-red-500'
                      } `}
                    ></div>
                  </Btn>
                  <div className="rounded-full bg-level-3 ring-2 ring-level-3/40 size-10"></div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between ">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-colors
                    ${requestsOpen ? '' : ''}`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${requestsOpen ? 'bg-emerald-400' : 'bg-text-placeholder'}`}
                      aria-hidden
                    />
                    {requestsOpen
                      ? t('publicView.requestsOpen')
                      : t('publicView.requestsClosed')}
                  </span>
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-medium border border-level-3/20 bg-level-1/50 text-text-secondary`}
                  >
                    {playlist.settings.mode === 'flow'
                      ? t('publicView.modeFlow')
                      : t('publicView.modeStatic')}
                  </span>
                </div>
                <time
                  dateTime={playlist.updated_at}
                  className="inline-flex items-center gap-1.5 text-sm text-text-placeholder shrink-0"
                >
                  <Calendar className="h-3.5 w-3.5" />
                  {updatedLabel}
                </time>
              </div>
            </div>
          </header>

          {showContentSettings && (
            <div className={`h-full ring-1 ring-level-3 p-1 m-1 rounded-md`}>
              <div className="flex flex-col gap-2 sm:gap-3">
                <div className={`flex items-center justify-between`}>
                  <div className="flex gap-2 flex-wrap">
                    {playlist.settings.content_settings.map(
                      (setting, index) => (
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
                      ),
                    )}
                  </div>
                </div>
                {contentSettings && (
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
                )}
              </div>
            </div>
          )}
        </section>

        {/* Track queue */}
        <section className={``}>
          <div className="flex items-center justify-between mb-6">
            <h2
              className={`text-lg font-semibold text-text-main  ${sectionTitleClass}`}
            >
              {t('publicView.queue')}
            </h2>
            <span className="text-sm text-text-secondary tabular-nums">
              {t('publicView.trackCount', {
                count: playlistState.track_data.length,
              })}
            </span>
          </div>

          {playlistState.track_data.length === 0 ? (
            <div
              className={`text-center py-12 border border-dashed border-level-3/50 rounded-(--rounded-std) bg-level-1/50`}
            >
              <p className={`text-text-main font-medium mb-1`}>
                {t('publicView.queueEmptyPlaylist')}
              </p>
              <p className="text-sm text-text-secondary">
                {t('publicView.queueEmptyWaiting')}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-1 ">
              <PlaylistProvider playlist={playlist}>
                <ViewerQueuePanel
                  tracks={viewer.orderedTracks}
                  sort={viewer.sort}
                  onSortChange={viewer.setSort}
                  activeTrackId={viewer.currentTrack?.id}
                  isPlaying={viewer.isPlaying}
                  onPlay={(track) => viewer.playTrack(track)}
                />
              </PlaylistProvider>
            </div>
          )}
        </section>
        <SubscriptionCreateModal
          isOpen={openNewSubModal}
          targetName={playlistState.name}
          targetType="playlist"
          onCreate={handleCreateSubscription}
          onClose={() => setOpenNewSubModal(false)}
        />
      </div>
    </div>
  )
}

export default PlaylistViewer
