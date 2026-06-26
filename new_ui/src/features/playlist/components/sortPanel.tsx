import React from 'react'
import Arrow from '@/components/icons/icon-arrow'

import useMusicStore from '@/stores/musicStore'
import { usePlaylist } from '@/features/playlist/context/playlist-context'
import { useDebouncedEffect } from '@/hooks/useDeboucedEffect'
import type { SortSettings } from '@/types/playlist'
import { toast } from 'sonner'
import { ArrowUpRight, Calendar } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import Btn from '@/components/ui/my-btn'

export default function SortPanel() {
  const playlist = usePlaylist()
  const { requestPlSettings } = useMusicStore()
  const { t } = useTranslation()
  const setPlaylist = useMusicStore((s) => s.setPlaylist)
  const [sortSettings, setSortSettings] = React.useState<SortSettings>(
    playlist.settings.sort_settings,
  )
  const canRequest = React.useRef(false)

  useDebouncedEffect(
    sortSettings,
    async () => {
      if (!canRequest.current) return
      canRequest.current = false
      await requestPlSettings(playlist.id, { sort_settings: sortSettings })
      toast.success(t('common.toast.saved'))
    },
    2000,
  )

  const updateSettings = (newSettings: SortSettings) => {
    setSortSettings(newSettings)
    setPlaylist({
      ...playlist,
      settings: { ...playlist.settings, sort_settings: newSettings },
    })
    canRequest.current = true
  }

  return (
    <div className="flex gap-2 sm:gap-3 justify-center items-end">
      {/* Priority Категория (Использует isActive только для визуала вжатости) */}
      <Btn
        title={t('sort.priority.title')}
        isActive={sortSettings.priority !== 'none'}
        onClick={() =>
          updateSettings({
            ...sortSettings,
            priority: sortSettings.priority === 'none' ? 'desc' : 'none',
          })
        }
        className="px-5"
        text={<ArrowUpRight className="size-6 sm:size-8 p-1" />}
      />

      {/* Priority Направление */}
      <div className="flex flex-col gap-1">
        <Btn
          title={t('sort.priority.lowFirst')}
          isActive={sortSettings.priority === 'asc'}
          disabled={sortSettings.priority === 'none'}
          onClick={() => updateSettings({ ...sortSettings, priority: 'asc' })}
          className="px-5 pt-px! pb-px! sm:pt-0.5! sm:pb-0.75!"
          text={<Arrow className="size-2 sm:size-3 rotate-180" />}
        />
        <Btn
          title={t('sort.priority.highFirst')}
          isActive={sortSettings.priority === 'desc'}
          disabled={sortSettings.priority === 'none'}
          onClick={() => updateSettings({ ...sortSettings, priority: 'desc' })}
          className="px-5 pt-px! pb-px! sm:pt-0.5! sm:pb-0.75!"
          text={<Arrow className="size-2 sm:size-3" />}
        />
      </div>

      {/* Date Категория */}
      <Btn
        title={t('sort.date.title')}
        isActive={sortSettings.date !== 'none'}
        onClick={() =>
          updateSettings({
            ...sortSettings,
            date: sortSettings.date === 'none' ? 'desc' : 'none',
          })
        }
        className="px-5"
        text={<Calendar className="size-6 sm:size-8 p-1" />}
      />

      {/* Date Направление */}
      <div className="flex flex-col gap-1">
        <Btn
          title={t('sort.date.olderFirst')}
          isActive={sortSettings.date === 'asc'}
          disabled={sortSettings.date === 'none'}
          onClick={() => updateSettings({ ...sortSettings, date: 'asc' })}
          className="px-5 pt-px! pb-px! sm:pt-0.5! sm:pb-0.75!"
          text={<Arrow className="size-2 sm:size-3 rotate-180" />}
        />
        <Btn
          title={t('sort.date.newerFirst')}
          isActive={sortSettings.date === 'desc'}
          disabled={sortSettings.date === 'none'}
          onClick={() => updateSettings({ ...sortSettings, date: 'desc' })}
          className="px-5 pt-px! pb-px! sm:pt-0.5! sm:pb-0.75!"
          text={<Arrow className="size-2 sm:size-3" />}
        />
      </div>
    </div>
  )
}
