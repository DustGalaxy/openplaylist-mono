import React from 'react'
import { useTranslation } from 'react-i18next'
import { BarChart3, Clock, Music, Play, Sparkles } from 'lucide-react'
import { useUserPublicStats } from '../../hooks/useStats'
import { formatSecondsToReadable } from './KpiCard'
import { cn } from '@/lib/utils'

interface UserPopoverStatsWidgetProps {
  userId?: string | null
  className?: string
}

export const UserPopoverStatsWidget: React.FC<UserPopoverStatsWidgetProps> = ({
  userId,
  className,
}) => {
  const { t } = useTranslation()
  const { data: publicStats, isLoading } = useUserPublicStats(
    userId,
    'all_time',
  )

  if (!userId) return null

  const outgoing = publicStats?.outgoing
  const incoming = publicStats?.incoming

  const totalOrders =
    (outgoing?.total_orders ?? 0) + (incoming?.total_orders ?? 0)
  const totalSeconds =
    (outgoing?.total_duration_seconds ?? 0) +
    (incoming?.total_duration_seconds ?? 0)

  const topTrack = outgoing?.top_tracks?.[0] || incoming?.top_tracks?.[0]

  if (isLoading) {
    return (
      <div
        className={cn(
          'p-3 rounded-lg bg-level-2/60 border border-accent/40 animate-pulse',
          className,
        )}
      >
        <div className="h-4 w-28 bg-level-1 rounded mb-2" />
        <div className="h-8 bg-level-1 rounded" />
      </div>
    )
  }

  // If both outgoing and incoming are null or empty (e.g. hidden by privacy settings)
  if (!outgoing && !incoming && totalOrders === 0) {
    return null
  }

  return (
    <div
      className={cn(
        'p-3 rounded-xl bg-gradient-to-br from-level-2/90 to-level-1/90 border border-accent/60 shadow-sm flex flex-col gap-2.5',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] uppercase font-bold tracking-wider text-accent flex items-center gap-1">
          <BarChart3 className="size-3.5" />
          {t('stats.userWidget.title', 'Public Statistics')}
        </span>
        <span className="text-[10px] text-text-secondary font-mono px-1.5 py-0.5 rounded bg-level-1 border border-accent/30">
          {t('stats.periods.all_time', 'All time')}
        </span>
      </div>

      {/* Mini metric badges */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2 rounded-lg bg-level-1/80 border border-accent/40">
          <span className="text-[10px] text-text-secondary font-medium block">
            {t('stats.totalOrders', 'Total Orders')}
          </span>
          <span className="text-sm font-black text-text-main font-mono">
            {totalOrders.toLocaleString()}
          </span>
        </div>

        <div className="p-2 rounded-lg bg-level-1/80 border border-accent/40">
          <span className="text-[10px] text-text-secondary font-medium block">
            {t('stats.duration', 'Duration')}
          </span>
          <span className="text-sm font-black text-text-main font-mono">
            {formatSecondsToReadable(totalSeconds)}
          </span>
        </div>
      </div>

      {/* Favorite / Top Track preview */}
      {topTrack && (
        <div className="p-2 rounded-lg bg-level-1 border border-accent/40 flex items-center gap-2.5 min-w-0">
          <div className="relative size-8 rounded overflow-hidden bg-level-2 shrink-0">
            <img
              src={`https://img.youtube.com/vi/${topTrack.yt_video_id}/mqdefault.jpg`}
              alt={topTrack.title}
              className="size-full object-cover"
            />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] text-text-secondary uppercase font-bold tracking-wider block">
              {t('stats.topFavoriteTrack', 'Top Track')}
            </span>
            <p className="text-xs font-bold text-text-main truncate">
              {topTrack.title}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserPopoverStatsWidget
