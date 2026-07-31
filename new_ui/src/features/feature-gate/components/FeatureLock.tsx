// src/features/feature-gate/components/FeatureLock.tsx
import { Lock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useFeatureGate } from '../hooks/useFeatureGate'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface FeatureLockProps {
  featureKey: string
  children: React.ReactNode
  /** Рендерить children приглушённо поверх лока вместо полного скрытия (напр. для toggle) */
  overlay?: boolean
  className?: string
}

export function FeatureLock({
  featureKey,
  children,
  overlay = true,
  className,
}: FeatureLockProps) {
  const { unlocked, minTier, isLoading } = useFeatureGate(featureKey)
  const { t } = useTranslation('common')

  if (isLoading) {
    return (
      <div className={cn('opacity-60 pointer-events-none', className)}>
        {children}
      </div>
    )
  }

  if (unlocked) {
    return <>{children}</>
  }

  if (!overlay) {
    return null
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn('relative', className)}>
          <div className="opacity-50 pointer-events-none select-none">
            {children}
          </div>
          <Lock className="absolute -top-1 -right-1 size-3.5 text-text-secondary" />
        </div>
      </TooltipTrigger>
      <TooltipContent className="bg-level-2 text-text-main">
        {t('featureGate.requiresTier', `Доступно с тира ${minTier}`, {
          tier: minTier,
        })}
      </TooltipContent>
    </Tooltip>
  )
}
