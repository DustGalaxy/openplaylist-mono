import type { PublicRole } from '@/types/user'
import { cn } from '@/lib/utils'

export interface RoleTierDef {
  tier: number
  label: string
  icon: string
  base: string // статичный tailwind-литерал, JIT интерполяцию не соберёт
}

// TODO(backend): подставить реальные tier-значения, когда пришлют полный список
export const ROLE_TIERS: Record<string, RoleTierDef> = {
  vip: {
    tier: 2,
    label: 'VIP',
    icon: '💎',
    base: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  },
  supporter: {
    tier: 1,
    label: 'Supporter',
    icon: '❤️',
    base: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  },
  admin: {
    tier: 3,
    label: 'Admin',
    icon: '🍵',
    base: 'bg-lime-500/10 text-lime-400 border-lime-500/30',
  },
}

const FALLBACK_TIER: RoleTierDef = {
  tier: -1,
  label: 'Member',
  icon: '',
  base: 'bg-level-2 text-text-secondary border-level-3',
}

export function getTierDef(key: string): RoleTierDef {
  const def = ROLE_TIERS[key]
  if (!def) console.debug('[roles] unknown tier', key)
  return def ?? FALLBACK_TIER
}

type DurationKey = 'new' | 'active' | 'loyal' | 'veteran' | 'legend'

interface DurationBucketDef {
  key: DurationKey
  minMonths: number
  extraClass: string
}

const DURATION_BUCKETS: Array<DurationBucketDef> = [
  {
    key: 'legend',
    minMonths: 12,
    extraClass: 'animate-bg-move-w-shadow shadow-[0_0_14px_-2px_currentColor]',
  },
  {
    key: 'veteran',
    minMonths: 6,
    extraClass: 'shadow-[0_0_12px_-3px_currentColor]',
  },
  {
    key: 'loyal',
    minMonths: 3,
    extraClass: 'shadow-[0_0_8px_-3px_currentColor]',
  },
  { key: 'active', minMonths: 1, extraClass: 'ring-1 ring-current/20' },
  { key: 'new', minMonths: 0, extraClass: '' },
]

function monthsSince(iso: string): number {
  const start = new Date(iso)
  const now = new Date()
  const raw =
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth())
  return Math.max(0, now.getDate() < start.getDate() ? raw - 1 : raw)
}

function getDurationBucket(startDate: string): DurationBucketDef {
  const months = monthsSince(startDate)
  return (
    DURATION_BUCKETS.find((b) => months >= b.minMonths) ??
    DURATION_BUCKETS.at(-1)!
  )
}

function formatDuration(startDate: string): string {
  const months = monthsSince(startDate)
  if (months < 1) return 'новичок'
  const years = Math.floor(months / 12)
  const rem = months % 12
  if (years === 0) return `${months} мес.`
  return rem === 0 ? `${years} г.` : `${years} г. ${rem} мес.`
}

// ─── Визуал одной роли ───

export interface RoleVisual {
  label: string
  icon: string
  className: string
  tooltip: string
}

export function getRoleVisual(role: PublicRole): RoleVisual {
  const tierDef = getTierDef(role.id)
  const bucket = getDurationBucket(role.start_date)
  return {
    label: tierDef.label,
    icon: tierDef.icon,
    className: cn(tierDef.base, bucket.extraClass),
    tooltip: `${tierDef.label} · ${formatDuration(role.start_date)}`,
  }
}

// ─── Отбор для отображения: топ-3 по tier (важность), тай-брейк по длительности ───

export function pickDisplayRoles(
  roles: Array<PublicRole>,
  limit = 3,
): { visible: Array<PublicRole>; hidden: Array<PublicRole> } {
  const sorted = [...roles].sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier // меньше tier = важнее; поменять знак если у бэка наоборот
    return new Date(a.start_date).getTime() - new Date(b.start_date).getTime() // старее — выше при равном tier
  })
  return { visible: sorted.slice(0, limit), hidden: sorted.slice(limit) }
}
