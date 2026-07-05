import React from 'react'
import Arrow from '@/components/icons/icon-arrow'
import useMusicStore from '@/stores/musicStore'
import { usePlaylist } from '@/features/playlist/context/playlist-context'
import type { SortSettings, OrderMode } from '@/types/playlist'
import { ArrowUpRight, Calendar, Minus, Shuffle, GripVertical, Crown, ListMusic, Layers, ArrowUpDown, ArrowDown01, ArrowUp01 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import {
  filterTabActiveClass,
  filterTabBaseClass,
  filterTabInactiveClass,
} from '@/features/landing/styles'
import { cn } from '@/lib/utils'

type SortDirection = 'none' | 'asc' | 'desc'
type QueueGroup = 'vip' | 'regular' | 'background'

// Маппинг иконок для сжатого состояния
const queueIcons: Record<QueueGroup, React.ComponentType<{ className?: string }>> = {
  vip: Crown,
  regular: ListMusic,
  background: Layers,
}

const nextDirection = (d: SortDirection): SortDirection =>
  d === 'none' ? 'desc' : d === 'desc' ? 'asc' : 'none'

function SortDirectionIndicator({ direction }: { direction: SortDirection }) {
  const styleBase = `size-4 transition-transform duration-200 animate-[sort-pop_250ms_ease-out]`
  if (direction === 'none') return <Minus className={cn(styleBase, "text-text-placeholder")} />
  return direction === 'asc' ? <ArrowUp01 className={styleBase} /> : <ArrowDown01 className={styleBase} />
}

function OrderModeToggle({
  value,
  onChange,
}: {
  value: OrderMode
  onChange: (m: OrderMode) => void
}) {
  const { t } = useTranslation()
  const modes: Array<{ key: OrderMode; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { key: 'auto', label: t('sort.mode.auto'), icon: ArrowUpDown },
    { key: 'random', label: t('sort.mode.random'), icon: Shuffle },
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

  if (sortSettings.order_mode === 'random') {
    return (
      <div className="hidden md:flex items-center gap-1 text-text-placeholder text-xs py-2 ">
        <Shuffle className="size-4" />
        <span className=''>{t('sort.mode.randomHint')}</span>
      </div>
    )
  }

  if (sortSettings.order_mode === 'free') {
    return (
      <div className="hidden md:flex items-center gap-1 text-text-placeholder text-xs py-2">
        <GripVertical className="size-4" />
        <span className='hidden md:inline'>{t('sort.mode.freeHint')}</span>
      </div>
    )
  }

  return (
    <div className="flex gap-2 sm:gap-3 justify-center items-end">
      <button
        title={
          sortSettings.priority === 'asc' ? t('sort.priority.lowFirst')
            : sortSettings.priority === 'desc' ? t('sort.priority.highFirst')
              : t('sort.priority.title')
        }
        onClick={() => onChange({ priority: nextDirection(sortSettings.priority) })}
        className={cn(
          filterTabBaseClass,
          'p-1 text-xs flex items-center justify-center',
          sortSettings.priority !== 'none' ? filterTabActiveClass : filterTabInactiveClass,
          "flex"
        )}
      >
        <span className="flex flex-col sm:flex-row items-center gap-1">
          <ArrowUpRight className="size-6 sm:size-6.5 px-1" />
          <SortDirectionIndicator direction={sortSettings.priority} />
        </span>
      </button>

      <button
        title={
          sortSettings.date === 'asc' ? t('sort.date.olderFirst')
            : sortSettings.date === 'desc' ? t('sort.date.newerFirst')
              : t('sort.date.title')
        }
        onClick={() => onChange({ date: nextDirection(sortSettings.date) })}
        className={cn(
          filterTabBaseClass,
          'p-1 text-xs  items-center justify-center',
          sortSettings.date !== 'none' ? filterTabActiveClass : filterTabInactiveClass,
          "flex "
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
  const playlist = usePlaylist()
  const { requestPlSettings } = useMusicStore()
  const { t } = useTranslation()

  const { mode, mode_settings } = playlist.settings
  const activeModeSettings = mode_settings[mode]

  const hasVipQueue = activeModeSettings.priority_break_point > 0
  const hasBackgroundQueue = mode === 'stream'
  const groups: Array<QueueGroup> = [
    ...(hasVipQueue ? (['vip'] as const) : []),
    'regular',
    ...(hasBackgroundQueue ? (['background'] as const) : []),
  ]
  const showTabs = groups.length > 1

  const [activeTab, setActiveTab] = React.useState<QueueGroup>('regular')
  const tab = groups.includes(activeTab) ? activeTab : 'regular'

  const settingsKey = tab === 'vip' ? 'sort_settings_vip' : 'sort_settings_regular'

  const updateSettings = (patch: Partial<SortSettings>) => {
    requestPlSettings(playlist.id, {
      mode_settings: {
        ...mode_settings,
        [mode]: {
          ...activeModeSettings,
          [settingsKey]: { ...activeModeSettings[settingsKey], ...patch },
        },
      },
    })
  }

  return (
    <div className={`flex flex-row ${tab !== 'background' && 'justify-between'} sm:justify-start  gap-1 sm:gap-2 items-center`}>
      <style>{`
        @keyframes sort-pop {
          0%   { transform: scale(0.5); opacity: 0.3; }
          60%  { transform: scale(1.25); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

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
                {/* Текст скрывается на мобильных / в сжатом режиме */}
                <span className="hidden md:inline ml-1.5">{t(`sort.tabs.${g}`)}</span>
              </button>
            )
          })}

        </div>
      )}
      <div className={`w-px h-6 bg-text-main ${showTabs ? "block" : "hidden"}`} />
      {tab === 'background' ? (
        <div className="flex items-center gap-1 text-text-placeholder text-xs py-2">
          <GripVertical className="size-4" />
          <span className='hidden sm:inline'>{t('sort.mode.freeHint')}</span>
        </div>
      ) : (
        <>
          <div className='flex items-center-safe gap-1'>
            <OrderModeToggle
              value={activeModeSettings[settingsKey].order_mode}
              onChange={(order_mode) => updateSettings({ order_mode })}
            />

          </div>
          <div className={`w-px h-6 bg-text-main ${activeModeSettings[settingsKey].order_mode === "auto" ? "block" : "hidden sm:block"}`} />
          <SortButtons sortSettings={activeModeSettings[settingsKey]} onChange={updateSettings} />
        </>
      )}
    </div>
  )
}