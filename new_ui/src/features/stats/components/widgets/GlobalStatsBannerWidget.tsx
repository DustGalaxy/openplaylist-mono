import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Clock, Disc3, Layers, Music, Sparkles } from 'lucide-react'
import { useGlobalStats } from '../../hooks/useStats'
import type { StatsPeriod } from '../../types'
import { formatSecondsToReadable } from './KpiCard'
import PeriodSelector from './PeriodSelector'
import { badgeClass, panelClass } from '@/features/landing/styles'
import { cn } from '@/lib/utils'

interface GlobalStatsBannerWidgetProps {
  className?: string
}

export const GlobalStatsBannerWidget: React.FC<
  GlobalStatsBannerWidgetProps
> = ({ className }) => {
  const { t } = useTranslation()
  const [period, setPeriod] = useState<StatsPeriod>('30d')
  const { data: globalStats, isLoading } = useGlobalStats(period)

  const totalOrders = globalStats?.total_orders ?? 0
  const totalDurationSeconds = globalStats?.total_duration_seconds ?? 0
  const topTracks = globalStats?.top_tracks ?? []
  const platformBreakdown = globalStats?.platform_breakdown ?? []

  return (
    <section
      className={cn(
        'relative p-5 sm:p-6 overflow-hidden transition-all',
        panelClass,
        className,
      )}
    >
      {/* Subtle background glow */}
      <div className="absolute -top-20 -right-20 size-72 rounded-full bg-accent/8 blur-2xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 relative z-10">
        <div>
          <div className={`${badgeClass} mb-2`}>
            <Sparkles className="size-3.5 text-accent shrink-0" />
            <span>{t('stats.globalBanner.badge', 'Live Platform Statistics')}</span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-text-main">
            {t('stats.globalBanner.title', 'OpenPlaylist Analytics')}
          </h2>
        </div>

        <PeriodSelector period={period} onChange={setPeriod} />
      </div>

      {/* KPI Cards row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 relative z-10">
        <div className="p-3.5 rounded-(--rounded-std) bg-level-1 border border-accent/30 flex items-center gap-3">
          <div className="p-2.5 rounded-md bg-level-2 text-accent-2 border border-accent/20 shrink-0">
            <Disc3 className="size-5" />
          </div>
          <div>
            <span className="text-[11px] uppercase font-semibold text-text-secondary block">
              {t('stats.totalOrders', 'Total Orders')}
            </span>
            <div className="text-xl font-extrabold text-text-main font-mono">
              {isLoading ? '...' : totalOrders.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-(--rounded-std) bg-level-1 border border-accent/30 flex items-center gap-3">
          <div className="p-2.5 rounded-md bg-level-2 text-accent-3 border border-accent/20 shrink-0">
            <Clock className="size-5" />
          </div>
          <div>
            <span className="text-[11px] uppercase font-semibold text-text-secondary block">
              {t('stats.totalDuration', 'Total Listening Time')}
            </span>
            <div className="text-xl font-extrabold text-text-main font-mono">
              {isLoading
                ? '...'
                : formatSecondsToReadable(totalDurationSeconds)}
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-(--rounded-std) bg-level-1 border border-accent/30 flex items-center gap-3">
          <div className="p-2.5 rounded-md bg-level-2 text-emerald-400 border border-accent/20 shrink-0">
            <Layers className="size-5" />
          </div>
          <div>
            <span className="text-[11px] uppercase font-semibold text-text-secondary block">
              {t('stats.activePlatforms', 'Platforms Active')}
            </span>
            <div className="text-xl font-extrabold text-text-main font-mono">
              {isLoading ? '...' : platformBreakdown.length}
            </div>
          </div>
        </div>
      </div>

      {/* Top 3 tracks preview */}
      {topTracks.length > 0 && (
        <div className="relative z-10 border-t border-accent/30 pt-3.5">
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary mb-2.5 flex items-center gap-1.5">
            <Music className="size-3 text-accent" />
            {t('stats.topTracks.popularNow', 'Most Requested Tracks')}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {topTracks.slice(0, 3).map((track, i) => (
              <div
                key={`${track.yt_video_id}-${i}`}
                className="flex items-center gap-2.5 p-2 rounded-md bg-level-1 border border-accent/25"
              >
                <img
                  src={`https://img.youtube.com/vi/${track.yt_video_id}/mqdefault.jpg`}
                  alt={track.title}
                  className="size-8 rounded object-cover shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-text-main truncate">
                    {track.title}
                  </p>
                  <p className="text-[10px] text-text-secondary font-mono">
                    {track.count} {t('stats.topTracks.orders', 'orders')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

export default GlobalStatsBannerWidget
