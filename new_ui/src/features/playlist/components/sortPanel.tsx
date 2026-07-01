import React from 'react'
import Arrow from '@/components/icons/icon-arrow'

import useMusicStore from '@/stores/musicStore'
import { usePlaylist } from '@/features/playlist/context/playlist-context'
import type { SortSettings } from '@/types/playlist'
import { ArrowUpRight, Calendar, Minus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Btn from '@/components/ui/my-btn'

type SortDirection = 'none' | 'asc' | 'desc'

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
      className={`size-2 sm:size-3 transition-transform duration-200 animate-[sort-pop_250ms_ease-out] ${
        direction === 'asc' ? 'rotate-180' : ''
      }`}
    />
  )
}

export default function SortPanel() {
  const playlist = usePlaylist()
  const { requestPlSettings } = useMusicStore()
  const { t } = useTranslation()

  const sortSettings = playlist.settings.sort_settings

  const updateSettings = (newSettings: Partial<SortSettings>) => {
    requestPlSettings(playlist.id, {
      sort_settings: {
        ...sortSettings,
        ...newSettings,
      },
    })
  }

  return (
    <>
      {/* Inline keyframe for the pop animation */}
      <style>{`
        @keyframes sort-pop {
          0%   { transform: scale(0.5); opacity: 0.3; }
          60%  { transform: scale(1.25); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

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
            updateSettings({ priority: nextDirection(sortSettings.priority) })
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
          onClick={() =>
            updateSettings({ date: nextDirection(sortSettings.date) })
          }
          className="px-5"
          text={
            <span className="flex items-center gap-1">
              <Calendar className="size-6 sm:size-8 p-1" />
              <SortDirectionIndicator direction={sortSettings.date} />
            </span>
          }
        />
      </div>
    </>
  )
}
