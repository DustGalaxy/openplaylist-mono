// src/features/playlist/components/sortPanel.tsx
import React from 'react'
import {
  ArrowDown01,
  ArrowUp01,
  ArrowUpDown,
  ArrowUpRight,
  Calendar,
  Crown,
  GripVertical,
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
import { cn } from '@/lib/utils'
import { useFeatureTranslation } from '@/lib/i18n/featureTranslation'

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
    'size-3.5 transition-transform duration-200 animate-[sort-pop_250ms_ease-out]'
  if (direction === 'none')
    return <Minus className={cn(styleBase, 'text-text-placeholder/60')} />
  return direction === 'asc' ? (
    <ArrowUp01 className={cn(styleBase, 'text-accent')} />
  ) : (
    <ArrowDown01 className={cn(styleBase, 'text-accent')} />
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
  const { t } = useFeatureTranslation()
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
    <div className="flex items-center gap-1 bg-level-2/80 p-1 rounded-md border border-white/5 shadow-xs">
      {modes.map((m) => {
        const Icon = m.icon
        const isActive = value === m.key
        return (
          <button
            key={m.key}
            type="button"
            onClick={() => onChange(m.key)}
            title={m.label}
            className={cn(
              'h-7.5 px-3 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer',
              isActive
                ? 'bg-level-1 text-text-main border border-accent/40 shadow-xs'
                : 'text-text-secondary hover:text-text-main hover:bg-level-1/40 border border-transparent',
            )}
          >
            <Icon
              className={cn(
                'size-3.5',
                isActive ? 'text-accent' : 'text-text-secondary',
              )}
            />
            <span className="hidden md:inline">{m.label}</span>
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
  const { t } = useFeatureTranslation()

  if (sortSettings.order_mode === 'host') {
    return (
      <div className="hidden md:flex items-center gap-1.5 text-text-secondary text-xs h-8 px-3 rounded-md bg-level-2/80 border border-white/5 shadow-xs">
        <Radio className="size-3.5 text-accent shrink-0" />
        <span>{t('sort.mode.hostHint')}</span>
      </div>
    )
  }
  if (sortSettings.order_mode === 'random') {
    return (
      <div className="hidden md:flex items-center gap-1.5 text-text-secondary text-xs h-8 px-3 rounded-md bg-level-2/80 border border-white/5 shadow-xs">
        <Shuffle className="size-3.5 text-accent shrink-0" />
        <span>{t('sort.mode.randomHint')}</span>
      </div>
    )
  }
  if (sortSettings.order_mode === 'free') {
    return (
      <div className="hidden md:flex items-center gap-1.5 text-text-secondary text-xs h-8 px-3 rounded-md bg-level-2/80 border border-white/5 shadow-xs">
        <GripVertical className="size-3.5 text-accent shrink-0" />
        <span className="hidden md:inline">{t('sort.mode.freeHint')}</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1 sm:gap-1.5">
      <button
        type="button"
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
          'h-8 px-3 text-xs font-medium rounded-md border transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs',
          sortSettings.priority !== 'none'
            ? 'bg-level-1 border-accent/50 text-text-main shadow-accent/5'
            : 'bg-level-2/80 border-white/5 text-text-secondary hover:bg-level-1/60 hover:text-text-main hover:border-white/10',
        )}
      >
        <ArrowUpRight
          className={cn(
            'size-3.5',
            sortSettings.priority !== 'none'
              ? 'text-accent'
              : 'text-text-secondary',
          )}
        />
        <SortDirectionIndicator direction={sortSettings.priority} />
      </button>

      <button
        type="button"
        title={
          sortSettings.date === 'asc'
            ? t('sort.date.olderFirst')
            : sortSettings.date === 'desc'
              ? t('sort.date.newerFirst')
              : t('sort.date.title')
        }
        onClick={() => onChange({ date: nextDirection(sortSettings.date) })}
        className={cn(
          'h-8 px-3 text-xs font-medium rounded-md border transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs',
          sortSettings.date !== 'none'
            ? 'bg-level-1 border-accent/50 text-text-main shadow-accent/5'
            : 'bg-level-2/80 border-white/5 text-text-secondary hover:bg-level-1/60 hover:text-text-main hover:border-white/10',
        )}
      >
        <Calendar
          className={cn(
            'size-3.5',
            sortSettings.date !== 'none'
              ? 'text-accent'
              : 'text-text-secondary',
          )}
        />
        <SortDirectionIndicator direction={sortSettings.date} />
      </button>
    </div>
  )
}

export default function SortPanel() {
  const { t } = useFeatureTranslation()
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
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        <style>{`@keyframes sort-pop { 0% { transform: scale(0.5); opacity: 0.3; } 60% { transform: scale(1.25); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }`}</style>
        <OrderModeToggle
          value={sortOverride.order_mode}
          onChange={(order_mode) => setSort(slot, 'regular', { order_mode })}
          showHost
        />
        {sortOverride.order_mode === 'auto' && (
          <>
            <div className="w-px h-4 bg-white/10 mx-0.5 shrink-0 hidden sm:block" />
            <SortButtons
              sortSettings={sortOverride}
              onChange={(patch) => setSort(slot, 'regular', patch)}
            />
          </>
        )}
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
  const currentSettings = activeModeSettings[settingsKey]

  return (
    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
      <style>{`@keyframes sort-pop { 0% { transform: scale(0.5); opacity: 0.3; } 60% { transform: scale(1.25); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }`}</style>

      {showTabs && (
        <div className="flex items-center gap-1 bg-level-2/80 p-1 rounded-md border border-white/5 shadow-xs">
          {groups.map((g) => {
            const Icon = queueIcons[g]
            const isActive = tab === g
            return (
              <button
                key={g}
                type="button"
                onClick={() => setActiveTab(g)}
                title={t(`sort.tabs.${g}`)}
                className={cn(
                  'h-7.5 px-3 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer',
                  isActive
                    ? 'bg-level-1 text-accent border border-accent/40 shadow-xs'
                    : 'text-text-secondary hover:text-text-main hover:bg-level-1/40 border border-transparent',
                )}
              >
                <Icon
                  className={cn(
                    'size-3.5',
                    isActive ? 'text-accent' : 'text-text-secondary',
                  )}
                />
                <span className="hidden sm:inline">
                  {t(`sort.tabs.${g}`)}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {showTabs && (
        <div className="w-px h-4 bg-white/10 mx-0.5 shrink-0 hidden sm:block" />
      )}

      <OrderModeToggle
        value={currentSettings.order_mode}
        onChange={(order_mode) => setSort(slot, tab, { order_mode })}
      />

      <div className="w-px h-4 bg-white/10 mx-0.5 shrink-0 hidden sm:block" />

      <SortButtons
        sortSettings={currentSettings}
        onChange={(patch) => setSort(slot, tab, patch)}
      />
    </div>
  )
}


