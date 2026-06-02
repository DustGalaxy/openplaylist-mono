import React from 'react'
import { useTranslation } from 'react-i18next'
import {
  Calendar,
  Clock,
  Eye,
  List,
  Music2,
  RefreshCcw,
  Settings,
  ThumbsUp,
  User,
} from 'lucide-react'

import ViewPlayNowCard from './view-track-card'
import Priority from '@/components/icons/icon-priority'
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
      className={`
        ${innerPanelClass} p-3 sm:p-4 flex flex-col gap-2
        transition-colors hover:border-level-3/30
      `}
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

function SectionBlock({
  title,
  children,
  className = '',
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={className}>
      <h3 className={sectionTitleClass}>{title}</h3>
      {children}
    </section>
  )
}

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
    <div className="flex flex-col gap-6 sm:gap-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
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

      <SectionBlock title={t('publicView.playlistSettings')}>
        {playlist.settings.content_settings.length > 1 && (
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
                {setting.platform}
              </button>
            ))}
          </div>
        )}

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
      </SectionBlock>

      {isAuthenticated && (
        <SectionBlock title={t('publicView.addTrack')}>
          <div className={`p-4 ${innerPanelClass}`}>
            <AddBar playlistId={playlist.id} />
          </div>
        </SectionBlock>
      )}

      <SectionBlock title={t('publicView.nowPlaying')}>
        {playlist.now_playing ? (
          <ViewPlayNowCard
            track={playlist.now_playing}
            playlist={playlist}
            now_playing={true}
          />
        ) : (
          <div
            className={`flex flex-col  items-center justify-center gap-3 py-10 px-4 text-center ${innerPanelClass} border-dashed`}
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
      </SectionBlock>
    </div>
  )
}

export default ViewInfoBar
