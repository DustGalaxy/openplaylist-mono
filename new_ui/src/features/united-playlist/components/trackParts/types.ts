import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export interface TrackCardAction {
  key: string
  icon?: LucideIcon
  label: string
  onClick?: () => void
  component?: () => ReactNode // для модалок/кастомного рендера пункта
  disabled?: boolean
}
