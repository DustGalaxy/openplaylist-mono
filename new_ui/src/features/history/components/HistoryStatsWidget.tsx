import React from 'react'
import { Clock, UserCheck, Disc } from 'lucide-react'
import type { PlaybackHistoryItem } from '@/api/api-history'
import { panelClass } from '@/features/landing/styles'

interface HistoryStatsWidgetProps {
  items: PlaybackHistoryItem[]
  totalCount: number
}

export const HistoryStatsWidget: React.FC<HistoryStatsWidgetProps> = ({
  items,
  totalCount,
}) => {
  const totalDurationSeconds = items.reduce((sum, item) => sum + (item.duration || 0), 0)
  const totalHours = Math.floor(totalDurationSeconds / 3600)
  const totalMinutes = Math.floor((totalDurationSeconds % 3600) / 60)

  // Calculate top requester
  const requesterCounts: Record<string, number> = {}
  items.forEach((item) => {
    if (item.requester_nickname) {
      requesterCounts[item.requester_nickname] = (requesterCounts[item.requester_nickname] || 0) + 1
    }
  })
  const topRequester = Object.entries(requesterCounts).sort((a, b) => b[1] - a[1])[0]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      {/* Total Played */}
      <div className={`flex items-center gap-4 p-4 ${panelClass} transition-all hover:border-accent/60`}>
        <div className="p-3 rounded-lg bg-level-1 text-accent border border-accent/20">
          <Disc className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs text-text-secondary font-medium uppercase tracking-wider">
            Всього відтворено
          </p>
          <p className="text-2xl font-bold tracking-tight text-text-main">{totalCount}</p>
        </div>
      </div>

      {/* Total Listening Time */}
      <div className={`flex items-center gap-4 p-4 ${panelClass} transition-all hover:border-accent/60`}>
        <div className="p-3 rounded-lg bg-level-1 text-emerald-400 border border-emerald-500/20">
          <Clock className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs text-text-secondary font-medium uppercase tracking-wider">
            Загальний час
          </p>
          <p className="text-2xl font-bold tracking-tight text-text-main">
            {totalHours > 0 ? `${totalHours}г ${totalMinutes}хв` : `${totalMinutes} хв`}
          </p>
        </div>
      </div>

      {/* Top Requester */}
      <div className={`flex items-center gap-4 p-4 ${panelClass} transition-all hover:border-accent/60`}>
        <div className="p-3 rounded-lg bg-level-1 text-purple-400 border border-purple-500/20">
          <UserCheck className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs text-text-secondary font-medium uppercase tracking-wider">
            Топ замовник
          </p>
          <p className="text-lg font-bold tracking-tight text-text-main truncate max-w-[150px]">
            {topRequester ? `${topRequester[0]} (${topRequester[1]})` : '—'}
          </p>
        </div>
      </div>
    </div>
  )
}
