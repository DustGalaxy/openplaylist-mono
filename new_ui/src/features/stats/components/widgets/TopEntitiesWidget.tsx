import React from 'react'
import { useTranslation } from 'react-i18next'
import { UserCheck, Users } from 'lucide-react'
import type { TopRequester, TopStreamer } from '../../types'
import { cn } from '@/lib/utils'

interface EntityItem {
  entity_id: string
  name: string
  count: number
}

interface TopEntitiesWidgetProps {
  entities: EntityItem[]
  title?: string
  limit?: number
  isLoading?: boolean
  type?: 'streamer' | 'requester'
  className?: string
}

export const TopEntitiesWidget: React.FC<TopEntitiesWidgetProps> = ({
  entities = [],
  title,
  limit = 5,
  isLoading = false,
  type = 'requester',
  className,
}) => {
  const { t } = useTranslation()
  const displayItems = entities.slice(0, limit)
  const maxCount = Math.max(...displayItems.map((item) => item.count), 1)

  const defaultTitle =
    type === 'streamer'
      ? t('stats.topStreamers.title', 'Top Streamers')
      : t('stats.topRequesters.title', 'Top Requesters')

  const Icon = type === 'streamer' ? UserCheck : Users

  return (
    <div
      className={cn(
        'rounded-xl border border-accent/50 bg-level-2 p-4 flex flex-col gap-3',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-text-main flex items-center gap-2">
          <Icon className="size-4 text-accent" />
          {title || defaultTitle}
        </h3>
        <span className="text-xs text-text-secondary font-mono font-medium">
          {entities.length} {t('stats.entities.total', 'users')}
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-10 bg-level-1 animate-pulse rounded-lg border border-accent/30"
            />
          ))}
        </div>
      ) : displayItems.length === 0 ? (
        <div className="py-6 text-center text-xs text-text-secondary bg-level-1/40 rounded-lg border border-dashed border-accent/40">
          {t('stats.entities.empty', 'No user statistics available')}
        </div>
      ) : (
        <div className="space-y-2.5">
          {displayItems.map((item, idx) => {
            const percentage = Math.round((item.count / maxCount) * 100)
            const displayName = item.name || t('stats.anonymous', 'Anonymous')

            return (
              <div key={`${item.entity_id}-${idx}`} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={cn(
                        'size-5 rounded-full shrink-0 text-[10px] font-bold flex items-center justify-center font-mono',
                        idx === 0
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                          : idx === 1
                            ? 'bg-slate-400/20 text-slate-300 border border-slate-400/40'
                            : idx === 2
                              ? 'bg-amber-700/20 text-amber-600 border border-amber-700/40'
                              : 'bg-level-1 text-text-secondary border border-accent/30',
                      )}
                    >
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-text-main truncate max-w-40 sm:max-w-60">
                      {displayName}
                    </span>
                  </div>
                  <span className="font-mono text-text-secondary font-medium shrink-0 ml-2">
                    {item.count} {t('stats.ordersCount', 'orders')}
                  </span>
                </div>

                {/* Animated progress bar */}
                <div className="h-1.5 w-full bg-level-1 rounded-full overflow-hidden border border-accent/30">
                  <div
                    className="h-full bg-gradient-to-r from-[var(--color-accent-2)] to-[var(--color-accent-3)] transition-all duration-500 rounded-full"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default TopEntitiesWidget
