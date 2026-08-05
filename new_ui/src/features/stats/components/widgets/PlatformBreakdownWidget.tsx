import React from 'react'
import { useTranslation } from 'react-i18next'
import { Layers } from 'lucide-react'
import type { PlatformBreakdown } from '../../types'
import { cn } from '@/lib/utils'

interface PlatformBreakdownWidgetProps {
  breakdown: PlatformBreakdown[]
  title?: string
  isLoading?: boolean
  className?: string
}

const PLATFORM_COLORS: Record<
  string,
  { bg: string; text: string; bar: string }
> = {
  web: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    bar: 'bg-blue-500',
  },
  twitch: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    bar: 'bg-purple-500',
  },
  donatex: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    bar: 'bg-emerald-500',
  },
  youtube: {
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    bar: 'bg-red-500',
  },
}

export const PlatformBreakdownWidget: React.FC<
  PlatformBreakdownWidgetProps
> = ({ breakdown = [], title, isLoading = false, className }) => {
  const { t } = useTranslation()
  const totalCount = breakdown.reduce((sum, p) => sum + p.count, 0)

  return (
    <div
      className={cn(
        'rounded-xl border border-accent/50 bg-level-2 p-4 flex flex-col gap-3',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-text-main flex items-center gap-2">
          <Layers className="size-4 text-accent" />
          {title || t('stats.platformBreakdown.title', 'Platform Breakdown')}
        </h3>
        <span className="text-xs text-text-secondary font-mono font-medium">
          {totalCount} {t('stats.total', 'total')}
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <div className="h-10 bg-level-1 animate-pulse rounded-lg" />
          <div className="h-10 bg-level-1 animate-pulse rounded-lg" />
        </div>
      ) : breakdown.length === 0 ? (
        <div className="py-6 text-center text-xs text-text-secondary bg-level-1/40 rounded-lg border border-dashed border-accent/40">
          {t('stats.platformBreakdown.empty', 'No platform data available')}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Combined stacked progress bar */}
          <div className="h-3 w-full bg-level-1 rounded-full overflow-hidden flex border border-accent/30">
            {breakdown.map((item, idx) => {
              const pct = totalCount > 0 ? (item.count / totalCount) * 100 : 0
              const colorInfo = PLATFORM_COLORS[
                item.platform.toLowerCase()
              ] || {
                bar: 'bg-accent',
              }
              return (
                <div
                  key={`${item.platform}-${idx}`}
                  style={{ width: `${pct}%` }}
                  className={cn(
                    'h-full transition-all duration-500',
                    colorInfo.bar,
                  )}
                  title={`${item.platform}: ${item.count} (${Math.round(pct)}%)`}
                />
              )
            })}
          </div>

          {/* List breakdown items */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {breakdown.map((item, idx) => {
              const pct =
                totalCount > 0 ? Math.round((item.count / totalCount) * 100) : 0
              const colorInfo = PLATFORM_COLORS[
                item.platform.toLowerCase()
              ] || {
                bg: 'bg-level-1',
                text: 'text-text-main',
              }

              return (
                <div
                  key={`${item.platform}-${idx}`}
                  className="flex items-center justify-between p-2 rounded-lg bg-level-1 border border-accent/40"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider',
                        colorInfo.bg,
                        colorInfo.text,
                      )}
                    >
                      {item.platform}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-text-main font-semibold">
                    {item.count}{' '}
                    <span className="text-text-secondary text-[11px] font-normal">
                      ({pct}%)
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default PlatformBreakdownWidget
