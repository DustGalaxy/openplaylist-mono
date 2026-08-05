import React from 'react'
import { useTranslation } from 'react-i18next'
import type { StatsPeriod } from '../../types'
import { cn } from '@/lib/utils'

interface PeriodSelectorProps {
  period: StatsPeriod
  onChange: (period: StatsPeriod) => void
  className?: string
}

const PERIODS: { value: StatsPeriod; labelKey: string; fallback: string }[] = [
  { value: '24h', labelKey: 'stats.periods.24h', fallback: '24 hours' },
  { value: '7d', labelKey: 'stats.periods.7d', fallback: '7 days' },
  { value: '30d', labelKey: 'stats.periods.30d', fallback: '30 days' },
  {
    value: 'all_time',
    labelKey: 'stats.periods.all_time',
    fallback: 'All time',
  },
]

export const PeriodSelector: React.FC<PeriodSelectorProps> = ({
  period,
  onChange,
  className,
}) => {
  const { t } = useTranslation()

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 bg-level-2 border border-accent/50 p-1 rounded-lg',
        className,
      )}
    >
      {PERIODS.map((item) => {
        const isActive = period === item.value
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            className={cn(
              'px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer select-none',
              isActive
                ? 'bg-level-1 text-text-main border border-accent/60 shadow-xs'
                : 'text-text-secondary hover:text-text-main hover:bg-level-1/40 border border-transparent',
            )}
          >
            {t(item.labelKey, item.fallback)}
          </button>
        )
      })}
    </div>
  )
}

export default PeriodSelector
