// src/components/ui/role-badge.tsx
import type { PublicRole } from '@/types/user'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  getRoleVisual,
  getTierDef,
  pickDisplayRoles,
} from '@/features/user-profile/lib/roles'
import { cn } from '@/lib/utils'

interface RoleBadgeProps {
  role: PublicRole
  size?: 'sm' | 'md'
}

export function RoleBadge({ role, size = 'sm' }: RoleBadgeProps) {
  const visual = getRoleVisual(role)
  const sizeClass =
    size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1'

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full border font-semibold cursor-default',
            sizeClass,
            visual.className,
          )}
        >
          {visual.icon && <span>{visual.icon}</span>}
          {visual.label}
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="bg-level-2 text-text-main">
        {visual.tooltip}
      </TooltipContent>
    </Tooltip>
  )
}

function RoleOverflowChip({ hiddenRoles }: { hiddenRoles: Array<PublicRole> }) {
  if (hiddenRoles.length === 0) return null
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center rounded-full border border-level-3 bg-level-2 px-2 py-0.5 text-[11px] font-semibold text-text-secondary cursor-default">
          +{hiddenRoles.length}
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="bg-level-2 text-text-main">
        {hiddenRoles.map((r) => getTierDef(r.tier).label).join(', ')}
      </TooltipContent>
    </Tooltip>
  )
}

interface RoleBadgeListProps {
  roles: Array<PublicRole>
  limit?: number
  size?: 'sm' | 'md'
}

export function RoleBadgeList({
  roles,
  limit = 3,
  size = 'sm',
}: RoleBadgeListProps) {
  const { visible, hidden } = pickDisplayRoles(roles, limit)
  if (visible.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {visible.map((role) => (
        <RoleBadge key={role.id} role={role} size={size} />
      ))}
      <RoleOverflowChip hiddenRoles={hidden} />
    </div>
  )
}
