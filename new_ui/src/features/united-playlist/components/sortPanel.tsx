// src/features/playlist/components/sortPanel.tsx
import React from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowDown01,
  ArrowUp01,
  ArrowUpDown,
  ArrowUpRight,
  Calendar,
  Crown,
  GripVertical,
  Layers,
  ListMusic,
  Minus,
  Radio,
  Shuffle,
} from 'lucide-react'
import {
  usePlaylistView,
  usePlaylistViewLoaded,
} from '../context/playlist-view-context'
import type { OrderMode, SortSettings } from '@/stores/playlistStore/types'
import { usePlaylistStore } from '@/stores/playlistStore'
import { getActiveModeSettings } from '@/stores/playlistStore/helpers'
import {
  filterTabActiveClass,
  filterTabBaseClass,
  filterTabInactiveClass,
} from '@/features/landing/styles'
import { cn } from '@/lib/utils'

type SortDirection = 'none' | 'asc' | 'desc'
type QueueGroup = 'vip' | 'regular'

const queueIcons: Record<
  QueueGroup,
  React.ComponentType<{ className?: string }>
> = {
  vip: Crown,
  regular: ListMusic,
}

const nextDirection = (d: SortDirection): SortDirection =>
  d === 'none' ? 'desc' : d === 'desc' ? 'asc' : 'none'

function SortDirectionIndicator({ direction }: { direction: SortDirection }) {
  const styleBase =
    'size-4 transition-transform duration-200 animate-[sort-pop_250ms_ease-out]'
  if (direction === 'none')
    return <Minus className={cn(styleBase, 'text-text-placeholder')} />
  return direction === 'asc' ? (
    <ArrowUp01 className={styleBase} />
  ) : (
    <ArrowDown01 className={styleBase} />
  )
}

function OrderModeToggle({
  value,
  onChange,
  showHost,
}: {
  value: OrderMode
  onChange: (m: OrderMode) => void
  showHost?: boolean
}) {
  const { t } = useTranslation()
  const modes: Array<{
    key: OrderMode
    label: string
    icon: React.ComponentType<{ className?: string }>
  }> = [
    ...(showHost
      ? [{ key: 'host' as const, label: t('sort.mode.host'), icon: Radio }]
      : []),
    { key: 'auto', label: t('sort.mode.auto'), icon: ArrowUpDown },
    { key: 'free', label: t('sort.mode.free'), icon: GripVertical },
  ]
  return (
    <div className="flex gap-1">
      {modes.map((m) => {
        const Icon = m.icon
        return (
          <button
            key={m.key}
            type="button"
            onClick={() => onChange(m.key)}
            title={m.label}
            className={cn(
              filterTabBaseClass,
              'p-2 text-xs flex items-center justify-center',
              value === m.key ? filterTabActiveClass : filterTabInactiveClass,
            )}
          >
            <Icon className="size-4" />
            <span className="hidden md:inline ml-1.5">{m.label}</span>
          </button>
        )
      })}
    </div>
  )
}

function SortButtons({
  sortSettings,
  onChange,
}: {
  sortSettings: SortSettings
  onChange: (next: Partial<SortSettings>) => void
}) {
  const { t } = useTranslation()

  if (sortSettings.order_mode === 'host') {
    return (
      <div className="hidden md:flex items-center gap-1 text-text-placeholder text-xs py-2">
        <Radio className="size-4" />
        <span>{t('sort.mode.hostHint')}</span>
      </div>
    )
  }
  if (sortSettings.order_mode === 'random') {
    return (
      <div className="hidden md:flex items-center gap-1 text-text-placeholder text-xs py-2">
        <Shuffle className="size-4" />
        <span>{t('sort.mode.randomHint')}</span>
      </div>
    )
  }
  if (sortSettings.order_mode === 'free') {
    return (
      <div className="hidden md:flex items-center gap-1 text-text-placeholder text-xs py-2">
        <GripVertical className="size-4" />
        <span className="hidden md:inline">{t('sort.mode.freeHint')}</span>
      </div>
    )
  }

  return (
    <div className="flex gap-2 sm:gap-3 justify-center items-end">
      <button
        title={
          sortSettings.priority === 'asc'
            ? t('sort.priority.lowFirst')
            : sortSettings.priority === 'desc'
              ? t('sort.priority.highFirst')
              : t('sort.priority.title')
        }
        onClick={() =>
          onChange({ priority: nextDirection(sortSettings.priority) })
        }
        className={cn(
          filterTabBaseClass,
          'p-1 text-xs flex items-center justify-center',
          sortSettings.priority !== 'none'
            ? filterTabActiveClass
            : filterTabInactiveClass,
        )}
      >
        <span className="flex flex-col sm:flex-row items-center gap-1">
          <ArrowUpRight className="size-6 sm:size-6.5 px-1" />
          <SortDirectionIndicator direction={sortSettings.priority} />
        </span>
      </button>
      <button
        title={
          sortSettings.date === 'asc'
            ? t('sort.date.olderFirst')
            : sortSettings.date === 'desc'
              ? t('sort.date.newerFirst')
              : t('sort.date.title')
        }
        onClick={() => onChange({ date: nextDirection(sortSettings.date) })}
        className={cn(
          filterTabBaseClass,
          'p-1 text-xs items-center justify-center flex',
          sortSettings.date !== 'none'
            ? filterTabActiveClass
            : filterTabInactiveClass,
        )}
      >
        <span className="flex flex-col sm:flex-row items-center gap-1">
          <Calendar className="size-6 sm:size-6.5 px-1" />
          <SortDirectionIndicator direction={sortSettings.date} />
        </span>
      </button>
    </div>
  )
}

export default function SortPanel() {
  const { t } = useTranslation()
  const { slot, role, playlistId } = usePlaylistView()
  const { playlist } = usePlaylistViewLoaded()
  const setSort = usePlaylistStore((s) => s.setSort)
  const sortOverride = usePlaylistStore((s) =>
    playlistId ? s.cache[playlistId]?.local.sortOverride : undefined,
  )

  const [activeTab, setActiveTab] = React.useState<QueueGroup>('regular')

  if (role === 'viewer') {
    if (!sortOverride) return null
    return (
      <div className="flex flex-row justify-between sm:justify-start gap-1 sm:gap-2 items-center">
        <style>{`@keyframes sort-pop { 0% { transform: scale(0.5); opacity: 0.3; } 60% { transform: scale(1.25); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }`}</style>
        <OrderModeToggle
          value={sortOverride.order_mode}
          onChange={(order_mode) => setSort(slot, 'regular', { order_mode })}
          showHost
        />
        <div
          className={`w-px h-6 bg-text-main ${sortOverride.order_mode === 'auto' ? 'block' : 'hidden sm:block'}`}
        />
        <SortButtons
          sortSettings={sortOverride}
          onChange={(patch) => setSort(slot, 'regular', patch)}
        />
      </div>
    )
  }

  const { mode, mode_settings } = playlist
  const activeModeSettings = mode_settings[mode]
  const hasVipQueue = activeModeSettings.priority_break_point > 0
  const groups: Array<QueueGroup> = [
    ...(hasVipQueue ? (['vip'] as const) : []),
    'regular',
  ]
  const showTabs = groups.length > 1
  const tab = groups.includes(activeTab) ? activeTab : 'regular'
  const settingsKey =
    tab === 'vip' ? 'sort_settings_vip' : 'sort_settings_regular'

  return (
    <div
      className={`flex flex-row justify-between sm:justify-start gap-1 sm:gap-2 items-center`}
    >
      <style>{`@keyframes sort-pop { 0% { transform: scale(0.5); opacity: 0.3; } 60% { transform: scale(1.25); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }`}</style>
      {showTabs && (
        <div className="flex gap-1 items-center">
          {groups.map((g) => {
            const Icon = queueIcons[g]
            return (
              <button
                key={g}
                type="button"
                onClick={() => setActiveTab(g)}
                title={t(`sort.tabs.${g}`)}
                className={cn(
                  filterTabBaseClass,
                  'p-2 text-xs flex items-center justify-center',
                  tab === g ? filterTabActiveClass : filterTabInactiveClass,
                )}
              >
                <Icon className="size-4" />
                <span className="hidden md:inline ml-1.5">
                  {t(`sort.tabs.${g}`)}
                </span>
              </button>
            )
          })}
        </div>
      )}
      <div
        className={`w-px h-6 bg-text-main ${showTabs ? 'block' : 'hidden'}`}
      />

      <OrderModeToggle
        value={activeModeSettings[settingsKey].order_mode}
        onChange={(order_mode) => setSort(slot, tab, { order_mode })}
      />
      <div
        className={`w-px h-6 bg-text-main ${activeModeSettings[settingsKey].order_mode === 'auto' ? 'block' : 'hidden sm:block'}`}
      />
      <SortButtons
        sortSettings={activeModeSettings[settingsKey]}
        onChange={(patch) => setSort(slot, tab, patch)}
      />
    </div>
  )
}
