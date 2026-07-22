// src/features/playlist/components/QueueList.tsx
import { useTranslation } from 'react-i18next'
import {
  usePlaylistView,
  usePlaylistViewLoaded,
} from '../context/playlist-view-context'
import QueueGroup from './QueueGroup'
import { usePlaylistStore } from '@/stores/playlistStore'
import {
  buildViewerFeed,
  getActiveModeSettings,
  splitQueue,
} from '@/stores/playlistStore/helpers'

export default function QueueList() {
  const { t } = useTranslation()
  const { role, playlistId } = usePlaylistView()
  const { playlist } = usePlaylistViewLoaded()
  const sortOverride = usePlaylistStore((s) =>
    playlistId ? s.cache[playlistId]?.local.sortOverride : undefined,
  )
  const playerPlaylistId = usePlaylistStore((s) => s.slots.player.playlistId)
  const playerCurrentTrackId = usePlaylistStore(
    (s) => s.slots.player.currentTrackId,
  )

  const isNowPlaying = (trackId: string) =>
    playerPlaylistId === playlistId
      ? trackId === playerCurrentTrackId
      : trackId === playlist.now_playing?.id

  if (playlist.track_data.length === 0) {
    return (
      <p className="text-sm text-text-secondary py-8 text-center w-full">
        {t('playlist.queue.empty')}
      </p>
    )
  }

  if (role === 'owner' || role === 'operator') {
    const { vip, regular, background } = splitQueue(playlist)
    const modeSettings = getActiveModeSettings(playlist)

    return (
      <div className="flex flex-col gap-4 w-full">
        <QueueGroup
          reorderKey="vip"
          items={vip.map((t) => ({ track: t, group: 'vip' as const }))}
          sortSettings={modeSettings.sort_settings_vip}
          isNowPlaying={isNowPlaying}
        />
        <QueueGroup
          reorderKey="regular"
          items={regular.map((t) => ({ track: t, group: 'regular' as const }))}
          sortSettings={modeSettings.sort_settings_regular}
          isNowPlaying={isNowPlaying}
        />
        <QueueGroup
          reorderKey="background"
          items={background.map((t) => ({
            track: t,
            group: 'background' as const,
          }))}
          sortSettings={modeSettings.sort_settings_background}
          showDivider
          dividerLabel={t('sort.tabs.background')}
          isNowPlaying={isNowPlaying}
        />
      </div>
    )
  }

  if (!sortOverride) return null
  const feed = buildViewerFeed(playlist, sortOverride)
  const mainItems = feed.filter((i) => i.group !== 'background')
  const backgroundItems = feed.filter((i) => i.group === 'background')

  return (
    <div className="flex flex-col gap-2 w-full">
      <QueueGroup
        reorderKey="main"
        items={mainItems}
        sortSettings={sortOverride}
        isNowPlaying={isNowPlaying}
      />
      <QueueGroup
        reorderKey="background"
        items={backgroundItems}
        sortSettings={sortOverride}
        showDivider
        dividerLabel={t('sort.tabs.background')}
        isNowPlaying={isNowPlaying}
      />
    </div>
  )
}
