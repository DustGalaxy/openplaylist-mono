import React from 'react'
import { useTranslation } from 'react-i18next'
import { Calendar, Music2 } from 'lucide-react'

import ViewPlayNowCard from './view-track-card'
import AddBar from '@/features/playlist/components/addbar'
import {
  filterTabActiveClass,
  filterTabBaseClass,
  filterTabInactiveClass,
  gradientTextClass,
  innerPanelClass,
  sectionTitleClass,
  statusClosedClass,
  statusOpenClass,
} from '@/features/landing/styles'
import type { ClientPlaylist } from '@/types/playlist'
import { useAuthStore } from '@/stores/authStore'
import { InfoCardGroup } from '@/components/ui/info-card-group'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

const ViewInfoBar = ({ playlist }: { playlist: ClientPlaylist }) => {
  const { t, i18n } = useTranslation()
  const { isAuthenticated } = useAuthStore()
  const [selectedContentSettingIndex, setSelectedContentSettingIndex] =
    React.useState(0)

  const contentSettings =
    playlist.settings.content_settings[selectedContentSettingIndex]

  const updatedLabel = new Date(playlist.updated_at).toLocaleDateString(
    i18n.language === 'ru' ? 'ru-RU' : 'en-US',
    { day: 'numeric', month: 'long', year: 'numeric' },
  )

  const requestsOpen = playlist.is_allow_external_requests

  return (
    <div className="flex flex-col gap-2 sm:gap-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between ">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`
              inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium
              border transition-colors
              ${requestsOpen ? statusOpenClass : statusClosedClass}
            `}
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

      <p className="text-sm sm:text-base text-text-secondary leading-relaxed border-l-2 border-level-3/40 pl-4">
        {playlist.description || t('publicView.noDescription')}
      </p>
      <Accordion type="single" collapsible>
        <AccordionItem value="settings">
          <AccordionTrigger>
            <h3 className={sectionTitleClass}>
              {t('publicView.playlistSettings')}
            </h3>
          </AccordionTrigger>
          <AccordionContent>
            <div className="flex gap-2 flex-wrap mb-4">
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
                  {setting.platform === '__general__'
                    ? t('common.general')
                    : t(`platform.${setting.platform}`)}
                </button>
              ))}
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
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      {isAuthenticated && (
        <>
          <h3 className={sectionTitleClass}>{t('publicView.addTrack')}</h3>
          <div className={`p-4 ${innerPanelClass}`}>
            <AddBar playlistId={playlist.id} ownerId={playlist.owner_id} />
          </div>
        </>
      )}

      <h3 className={sectionTitleClass}>{t('publicView.nowPlaying')}</h3>
      {playlist.now_playing ? (
        <ViewPlayNowCard
          track={playlist.now_playing}
          playlist={playlist}
          now_playing={true}
        />
      ) : (
        <div
          className={`flex flex-col  items-center justify-center gap-3 py-3 px-4 text-center ${innerPanelClass} border-dashed`}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-level-2/80 text-text-placeholder">
            <Music2 className="h-6 w-6" strokeWidth={1.5} />
          </div>
          <p className="text-sm text-text-secondary">
            {t('publicView.nowPlayingEmpty')}
          </p>
          <p className={`text-xs font-medium ${gradientTextClass}`}>
            {t('publicView.nowPlayingHint')}
          </p>
        </div>
      )}
    </div>
  )
}

export default ViewInfoBar
