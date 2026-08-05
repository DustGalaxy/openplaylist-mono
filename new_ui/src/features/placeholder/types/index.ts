import type { ReactNode, ComponentType } from 'react'

export interface PlaceholderWidgetProps {
  /** Title of the feature/placeholder (e.g., "Історія замовлень", "Аналітика плейлиста") */
  title?: ReactNode
  /** Short feature name used when title is not specified. E.g. "История заказов" */
  featureName?: string
  /** Detailed description explaining what will be added or why it is coming soon */
  description?: ReactNode
  /** Custom badge text (defaults to "Скоро з'явиться" / "Coming Soon") */
  badgeText?: string
  /** Custom status tag, e.g. "v2.0" or "В розробці" */
  statusTag?: string
  /** Custom icon component from lucide-react or React component */
  icon?: ComponentType<{ className?: string; size?: number | string }>
  /** Color class for the icon (defaults to 'text-accent') */
  iconColorClass?: string
  /** List of upcoming capabilities / highlight bullets to show */
  highlights?: string[]
  /** Custom action element or node */
  action?: ReactNode
  /** Action button text if custom action node is not passed */
  actionText?: string
  /** Callback for when action button is clicked */
  onAction?: () => void
  /** Navigation target URL if action button is clicked */
  actionLink?: string
  /** Size variant for padding and font sizing ('sm' | 'md' | 'lg' | 'auto') */
  size?: 'sm' | 'md' | 'lg' | 'auto'
  /** Max width Tailwind class to limit size (default: 'max-w-xl') */
  maxWClass?: string
  /** Max height Tailwind class to limit height (default: 'max-h-[600px]') */
  maxHClass?: string
  /** Additional container wrapper CSS classes */
  className?: string
  /** Card inner CSS classes (defaults to panelClass) */
  cardClassName?: string
  /** Whether to render ambient background glow effects (default: true) */
  showGlow?: boolean
  /** Whether to render wrapped in standard full-page container layout (pageWrapClass & pageInnerClass) */
  asPage?: boolean
}
