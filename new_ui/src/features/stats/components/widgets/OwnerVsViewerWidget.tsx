import React from 'react'
import { useTranslation } from 'react-i18next'
import { PieChart, User, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

interface OwnerVsViewerWidgetProps {
  data?: Record<string, number> | { owner?: number; viewer?: number } | null
  title?: string
  isLoading?: boolean
  className?: string
}

export const OwnerVsViewerWidget: React.FC<OwnerVsViewerWidgetProps> = ({
  data,
  title,
  isLoading = false,
  className,
}) => {
  const { t } = useTranslation()

  const ownerCount = Number(data?.owner ?? 0)
  const viewerCount = Number(data?.viewer ?? 0)
  const total = ownerCount + viewerCount

  const ownerPct = total > 0 ? Math.round((ownerCount / total) * 100) : 0
  const viewerPct = total > 0 ? 100 - ownerPct : 0

  return (
    <div
      className={cn(
        'rounded-xl border border-accent/50 bg-level-2 p-4 flex flex-col gap-3',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-text-main flex items-center gap-2">
          <PieChart className="size-4 text-accent" />
          {title || t('stats.ownerVsViewer.title', 'Owner vs Viewers')}
        </h3>
        <span className="text-xs text-text-secondary font-mono font-medium">
          {total} {t('stats.total', 'total')}
        </span>
      </div>

      {isLoading ? (
        <div className="h-12 bg-level-1 animate-pulse rounded-lg" />
      ) : total === 0 ? (
        <div className="py-6 text-center text-xs text-text-secondary bg-level-1/40 rounded-lg border border-dashed border-accent/40">
          {t('stats.ownerVsViewer.empty', 'No audience data available')}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Dual Progress Bar */}
          <div className="h-3 w-full bg-level-1 rounded-full overflow-hidden flex border border-accent/30">
            <div
              style={{ width: `${ownerPct}%` }}
              className="h-full bg-accent-2 transition-all duration-500"
              title={`${t('stats.ownerVsViewer.owner', 'Owner')}: ${ownerCount} (${ownerPct}%)`}
            />
            <div
              style={{ width: `${viewerPct}%` }}
              className="h-full bg-accent-3 transition-all duration-500"
              title={`${t('stats.ownerVsViewer.viewer', 'Viewers')}: ${viewerCount} (${viewerPct}%)`}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 rounded-lg bg-level-1 border border-accent/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded bg-accent-2/20 text-accent-2">
                  <User className="size-3.5" />
                </div>
                <span className="text-xs font-semibold text-text-main">
                  {t('stats.ownerVsViewer.owner', 'Owner')}
                </span>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold font-mono text-text-main">
                  {ownerCount}
                </div>
                <div className="text-[10px] text-text-secondary font-mono">
                  {ownerPct}%
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-level-1 border border-accent/40 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded bg-accent-3/20 text-accent-3">
                  <Users className="size-3.5" />
                </div>
                <span className="text-xs font-semibold text-text-main">
                  {t('stats.ownerVsViewer.viewer', 'Viewers')}
                </span>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold font-mono text-text-main">
                  {viewerCount}
                </div>
                <div className="text-[10px] text-text-secondary font-mono">
                  {viewerPct}%
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default OwnerVsViewerWidget
