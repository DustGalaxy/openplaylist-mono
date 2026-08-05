import React from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface KpiCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  iconColorClass?: string
  isLoading?: boolean
  className?: string
}

export const formatSecondsToReadable = (seconds: number): string => {
  if (!seconds || seconds <= 0) return '0m'
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  if (hours > 0) {
    return `${hours}h ${mins}m`
  }
  return `${mins}m`
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColorClass = 'text-accent',
  isLoading = false,
  className,
}) => {
  return (
    <div
      className={cn(
        'rounded-xl border border-accent/50 bg-level-2 p-4 flex flex-col justify-between transition-all duration-200 hover:border-accent hover:shadow-[0_0_20px_rgba(236,72,153,0.08)]',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
          {title}
        </span>
        <div
          className={cn(
            'p-2 rounded-lg bg-level-1 border border-accent/40 shrink-0',
            iconColorClass,
          )}
        >
          <Icon size={18} />
        </div>
      </div>

      {isLoading ? (
        <div className="h-8 w-24 bg-level-1 animate-pulse rounded-md my-1" />
      ) : (
        <div className="text-2xl sm:text-3xl font-extrabold text-text-main tracking-tight my-1">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
      )}

      {subtitle && (
        <p className="text-xs text-text-secondary truncate mt-0.5 font-medium">
          {subtitle}
        </p>
      )}
    </div>
  )
}

export default KpiCard
