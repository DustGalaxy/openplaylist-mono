import React from 'react'
import Arrow from '@/components/icons/icon-arrow'

import useMusicStore from '@/stores/musicStore'
import { usePlaylist } from '@/features/playlist/context/playlist-context'
import type { SortSettings } from '@/types/playlist'
import { ArrowUpRight, Calendar, Minus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Btn from '@/components/ui/my-btn'
import {
  filterTabActiveClass,
  filterTabBaseClass,
  filterTabInactiveClass,
} from '@/features/landing/styles'
import { cn } from '@/lib/utils'

type SortDirection = 'none' | 'asc' | 'desc'
type QueueTarget = 'vip' | 'background'

/** none → asc → desc → none */
const nextDirection = (current: SortDirection): SortDirection => {
  if (current === 'none') return 'asc'
  if (current === 'asc') return 'desc'
  return 'none'
}

/** Small indicator that always renders — line for none, arrow for asc/desc */
function SortDirectionIndicator({ direction }: { direction: SortDirection }) {
  if (direction === 'none') {
    return (
      <Minus
        key="none"
        className="size-2 sm:size-3 text-text-placeholder animate-[sort-pop_250ms_ease-out]"
      />
    )
  }

  return (
    <Arrow
      key={direction}
      className={`size-2 sm:size-3 transition-transform duration-200 animate-[sort-pop_250ms_ease-out] ${direction === 'asc' ? 'rotate-180' : ''
        }`}
    />
  )
}

/** Сами кнопки сортировки (priority/date) для одного набора SortSettings. */
function SortButtons({
  sortSettings,
  onChange,
}: {
  sortSettings: SortSettings
  onChange: (next: Partial<SortSettings>) => void
}) {
  const { t } = useTranslation()

  return (
    <div className="flex gap-2 sm:gap-3 justify-center items-end">
      {/* Priority — cycles: none → asc → desc → none */}
      <Btn
        title={
          sortSettings.priority === 'asc'
            ? t('sort.priority.lowFirst')
            : sortSettings.priority === 'desc'
              ? t('sort.priority.highFirst')
              : t('sort.priority.title')
        }
        isActive={sortSettings.priority !== 'none'}
        onClick={() =>
          onChange({ priority: nextDirection(sortSettings.priority) })
        }
        className="px-5"
        text={
          <span className="flex items-center gap-1">
            <ArrowUpRight className="size-6 sm:size-8 p-1" />
            <SortDirectionIndicator direction={sortSettings.priority} />
          </span>
        }
      />

      {/* Date — cycles: none → asc → desc → none */}
      <Btn
        title={
          sortSettings.date === 'asc'
            ? t('sort.date.olderFirst')
            : sortSettings.date === 'desc'
              ? t('sort.date.newerFirst')
              : t('sort.date.title')
        }
        isActive={sortSettings.date !== 'none'}
        onClick={() => onChange({ date: nextDirection(sortSettings.date) })}
        className="px-5"
        text={
          <span className="flex items-center gap-1">
            <Calendar className="size-6 sm:size-8 p-1" />
            <SortDirectionIndicator direction={sortSettings.date} />
          </span>
        }
      />
    </div>
  )
}

export default function SortPanel() {
  const playlist = usePlaylist()
  const { requestPlSettings } = useMusicStore()
  const { t } = useTranslation()

  const { mode, mode_settings } = playlist.settings
  const activeModeSettings = mode_settings[mode]

  // Табы нужны только когда в текущем режиме реально есть два разных
  // подмножества очереди: stream всегда их разделяет (фон vs заявки),
  // flow/static — только если включён break point (иначе всё это одна
  // обычная очередь, и второй таб был бы пустой формальностью).
  const hasVipQueue = mode === 'stream' || activeModeSettings.priority_break_point > 0

  const [activeTab, setActiveTab] = React.useState<QueueTarget>('background')

  const updateModeSettings = (
    target: QueueTarget,
    newSettings: Partial<SortSettings>,
  ) => {
    const key = target === 'vip' ? 'sort_settings_vip' : 'sort_settings_background'
    requestPlSettings(playlist.id, {
      mode_settings: {
        ...mode_settings,
        [mode]: {
          ...activeModeSettings,
          [key]: {
            ...activeModeSettings[key],
            ...newSettings,
          },
        },
      },
    })
  }

  return (
    <div className="flex flex-col gap-2 items-center">
      {/* Inline keyframe for the pop animation */}
      <style>{`
        @keyframes sort-pop {
          0%   { transform: scale(0.5); opacity: 0.3; }
          60%  { transform: scale(1.25); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      {hasVipQueue && (
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('vip')}
            className={cn(
              filterTabBaseClass,
              'px-3 text-xs',
              activeTab === 'vip' ? filterTabActiveClass : filterTabInactiveClass,
            )}
          >
            {t('sort.tabs.vip')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('background')}
            className={cn(
              filterTabBaseClass,
              'px-3 text-xs',
              activeTab === 'background'
                ? filterTabActiveClass
                : filterTabInactiveClass,
            )}
          >
            {t('sort.tabs.background')}
          </button>
        </div>
      )}

      <SortButtons
        sortSettings={
          hasVipQueue && activeTab === 'vip'
            ? activeModeSettings.sort_settings_vip
            : activeModeSettings.sort_settings_background
        }
        onChange={(next) =>
          updateModeSettings(hasVipQueue && activeTab === 'vip' ? 'vip' : 'background', next)
        }
      />
    </div>
  )
}