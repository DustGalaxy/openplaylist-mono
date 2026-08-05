import React from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from '@tanstack/react-router'
import { Sparkles, Clock, CheckCircle2, Layers, ArrowLeft } from 'lucide-react'
import type { PlaceholderWidgetProps } from '../types'
import {
  panelClass,
  pageWrapClass,
  pageInnerClass,
  gradientTextClass,
} from '@/features/landing/styles'
import { cn } from '@/lib/utils'

export const PlaceholderWidget: React.FC<PlaceholderWidgetProps> = ({
  title,
  featureName,
  description,
  badgeText,
  statusTag,
  icon: IconComponent = Clock,
  iconColorClass = 'text-accent',
  highlights,
  action,
  actionText,
  onAction,
  actionLink,
  size = 'md',
  maxWClass = 'max-w-xl',
  maxHClass = 'max-h-[600px]',
  className,
  cardClassName,
  showGlow = true,
  asPage = false,
}) => {
  const { t } = useTranslation('placeholder')
  const { t: tc } = useTranslation('common')

  const defaultBadgeText = badgeText || t('badge', "Скоро з'явиться")

  const displayTitle =
    title ||
    (featureName
      ? `${featureName}`
      : t('defaultTitle', 'Функція в розробці'))

  const displayDescription =
    description ||
    (featureName
      ? t(
          'featureDescription',
          'Ми активно працюємо над розділом "{{name}}". Він стане доступний у найближчих оновленнях!',
          { name: featureName },
        )
      : t(
          'defaultDescription',
          'Ми активно працюємо над цією функцією. Вона стане доступна у найближчих оновленнях!',
        ))

  const sizePaddingClass = {
    sm: 'p-4 sm:p-6 text-xs',
    md: 'p-6 sm:p-8 text-sm',
    lg: 'p-8 sm:p-10 text-base',
    auto: 'p-6 sm:p-8',
  }[size]

  const widgetContent = (
    <div
      className={cn(
        'relative w-full h-full min-h-[280px] sm:min-h-[340px]',
        'flex flex-col items-center justify-center text-center',
        'overflow-hidden transition-all duration-300',
        'mx-auto my-auto',
        maxWClass,
        maxHClass,
        sizePaddingClass,
        cardClassName || panelClass,
        className,
      )}
    >
      {/* Background ambient glow effects matching stats feature styling */}
      {showGlow && (
        <>
          <div className="absolute -top-20 -right-20 size-72 rounded-full bg-accent/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 size-72 rounded-full bg-accent/5 blur-3xl pointer-events-none" />
          <div className="absolute inset-0 bg-radial from-accent/5 via-transparent to-transparent opacity-60 pointer-events-none" />
        </>
      )}

      {/* Eyebrow Chip & Status Tag */}
      <div className="relative z-10 flex items-center justify-center gap-2 mb-4 flex-wrap">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-level-1 border border-accent/40 text-accent text-xs font-semibold tracking-wide shadow-xs">
          <Sparkles className="size-3.5 text-accent animate-pulse" />
          <span>{defaultBadgeText}</span>
        </div>

        {statusTag && (
          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-level-1/80 border border-accent/20 text-accent-2 font-mono text-[11px] font-semibold tracking-wider">
            {statusTag}
          </div>
        )}
      </div>

      {/* Main Icon Box */}
      <div className="relative z-10 mb-5 inline-flex items-center justify-center group">
        <div className="absolute inset-0 rounded-2xl bg-accent/20 blur-md transition-all duration-300 group-hover:bg-accent/30" />
        <div className="relative p-4 rounded-2xl bg-level-1 border border-accent/40 shadow-inner text-accent flex items-center justify-center">
          <IconComponent className={cn('size-8 sm:size-10', iconColorClass)} />
        </div>
      </div>

      {/* Title */}
      <h2 className="relative z-10 text-xl sm:text-2xl font-extrabold text-text-main tracking-tight mb-2 max-w-lg">
        {typeof displayTitle === 'string' && featureName ? (
          <>
            <span className={gradientTextClass}>{displayTitle}</span> —{' '}
            <span className="text-text-main">
              {t('comingSoonTag', "Скоро з'явиться")}
            </span>
          </>
        ) : (
          displayTitle
        )}
      </h2>

      {/* Subtitle / Description */}
      {displayDescription && (
        <p className="relative z-10 text-xs sm:text-sm text-text-secondary max-w-md mx-auto leading-relaxed mb-6">
          {displayDescription}
        </p>
      )}

      {/* Upcoming Feature Highlights */}
      {highlights && highlights.length > 0 && (
        <div className="relative z-10 w-full max-w-md bg-level-1/60 border border-accent/25 rounded-xl p-3.5 sm:p-4 mb-6 text-left shadow-xs">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary mb-2.5 flex items-center gap-1.5">
            <Layers className="size-3.5 text-accent" />
            {t('highlightsTitle', 'Що буде додано:')}
          </div>
          <ul className="space-y-2">
            {highlights.map((item, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2.5 text-xs text-text-main"
              >
                <CheckCircle2 className="size-3.5 text-accent shrink-0 mt-0.5" />
                <span className="leading-snug">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Button */}
      {(action || actionText || actionLink || onAction) && (
        <div className="relative z-10 flex items-center justify-center gap-3">
          {action ? (
            action
          ) : actionLink ? (
            <Link
              to={actionLink}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold text-text-main bg-level-1 border border-accent/50 rounded-lg hover:bg-level-1/80 hover:border-accent transition-all shadow-xs"
            >
              <ArrowLeft className="size-4" />
              {actionText || tc('back', 'Назад')}
            </Link>
          ) : onAction ? (
            <button
              type="button"
              onClick={onAction}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-bold text-text-main bg-level-1 border border-accent/50 rounded-lg hover:bg-level-1/80 hover:border-accent transition-all cursor-pointer shadow-xs"
            >
              <ArrowLeft className="size-4" />
              {actionText || tc('back', 'Назад')}
            </button>
          ) : null}
        </div>
      )}
    </div>
  )

  if (asPage) {
    return (
      <div className={pageWrapClass}>
        <div className={pageInnerClass}>{widgetContent}</div>
      </div>
    )
  }

  return widgetContent
}

export default PlaceholderWidget
