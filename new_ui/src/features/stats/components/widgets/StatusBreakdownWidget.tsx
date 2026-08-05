import React from 'react'
import { useTranslation } from 'react-i18next'
import { Activity } from 'lucide-react'
import type { StatusBreakdown } from '../../types'
import { cn } from '@/lib/utils'

interface StatusBreakdownWidgetProps {
  breakdown: StatusBreakdown[]
  title?: string
  isLoading?: boolean
  className?: string
}

const STATUS_CONFIG: Record<
  string,
  { labelKey: string; fallback: string; colorClass: string; bgClass: string }
> = {
  listened: {
    labelKey: 'stats.status.listened',
    fallback: 'Listened',
    colorClass: 'text-emerald-400',
    bgClass: 'bg-emerald-500/10 border-emerald-500/30',
  },
  'in playlist': {
    labelKey: 'stats.status.inPlaylist',
    fallback: 'In playlist',
    colorClass: 'text-blue-400',
    bgClass: 'bg-blue-500/10 border-blue-500/30',
  },
  skipped: {
    labelKey: 'stats.status.skipped',
    fallback: 'Skipped',
    colorClass: 'text-amber-400',
    bgClass: 'bg-amber-500/10 border-amber-500/30',
  },
  removed: {
    labelKey: 'stats.status.removed',
    fallback: 'Removed',
    colorClass: 'text-rose-400',
    bgClass: 'bg-rose-500/10 border-rose-500/30',
  },
}

export const StatusBreakdownWidget: React.FC<StatusBreakdownWidgetProps> = ({
  breakdown = [],
  title,
  isLoading = false,
  className,
}) => {
  const { t } = useTranslation()
  const totalCount = breakdown.reduce((sum, item) => sum + item.count, 0)

  return (
    <div
      className={cn(
        'rounded-xl border border-accent/50 bg-level-2 p-4 flex flex-col gap-3',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-text-main flex items-center gap-2">
          <Activity className="size-4 text-accent" />
          {title || t('stats.statusBreakdown.title', 'Order Statuses')}
        </h3>
        <span className="text-xs text-text-secondary font-mono font-medium">
          {totalCount} {t('stats.total', 'total')}
        </span>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-2">
          <div className="h-14 bg-level-1 animate-pulse rounded-lg" />
          <div className="h-14 bg-level-1 animate-pulse rounded-lg" />
        </div>
      ) : breakdown.length === 0 ? (
        <div className="py-6 text-center text-xs text-text-secondary bg-level-1/40 rounded-lg border border-dashed border-accent/40">
          {t('stats.statusBreakdown.empty', 'No status data available')}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {breakdown.map((item, idx) => {
            const normalizedStatus = item.status.toLowerCase()
            const config = STATUS_CONFIG[normalizedStatus] || {
              labelKey: '',
              fallback: item.status,
              colorClass: 'text-text-main',
              bgClass: 'bg-level-1 border-accent/40',
            }

            const pct =
              totalCount > 0 ? Math.round((item.count / totalCount) * 100) : 0

            return (
              <div
                key={`${item.status}-${idx}`}
                className={cn(
                  'flex flex-col justify-between p-3 rounded-lg border transition-all',
                  config.bgClass,
                )}
              >
                <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
                  {config.labelKey
                    ? t(config.labelKey, config.fallback)
                    : config.fallback}
                </span>
                <div className="flex items-baseline justify-between mt-1">
                  <span
                    className={cn(
                      'text-xl font-extrabold font-mono',
                      config.colorClass,
                    )}
                  >
                    {item.count}
                  </span>
                  <span className="text-xs text-text-secondary font-mono">
                    {pct}%
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default StatusBreakdownWidget
