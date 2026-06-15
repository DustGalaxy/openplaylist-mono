import React from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  ArrowUpRight,
  Bookmark,
  Calendar,
  ClipboardCopy,
  Play,
  Plus,
  Trash,
} from 'lucide-react'
import { usePlaylist } from '../context/playlist-context'
import Btn from '@/components/ui/my-btn'
import { formatTime } from '@/lib/utils'
import useMusicStore from '@/stores/musicStore'
import { useSavedStore } from '@/stores/savedStore'
import Person from '@/components/icons/icon-person'

interface OrderMiniCardProps {
  track: any // Track | SavedTrack
  btns_type?: 'playlist' | 'non-playlist'
}

export default function OrderMiniCard({
  track,
  btns_type = 'playlist',
}: OrderMiniCardProps) {
  const { t, i18n } = useTranslation()
  const playlist = usePlaylist()
  const bgUrl = `https://img.youtube.com/vi/${track.yt_video_id}/mqdefault.jpg`

  const { requestPlayNow, requestAddTrack, requestRemoveTrack } =
    useMusicStore()
  const { isSaved, addTrack, removeTrack } = useSavedStore()

  // Общая логика закладок
  const toggleSave = () => {
    if (isSaved(track.yt_video_id)) {
      removeTrack(track.yt_video_id)
    } else {
      addTrack({
        yt_video_id: track.yt_video_id,
        title: track.title,
        duration: track.duration,
      })
    }
  }

  // Общая логика копирования ссылки
  const copyLink = async () => {
    await navigator.clipboard.writeText(
      `https://www.youtube.com/watch?v=${track.yt_video_id}`,
    )
    toast.success(t('common.toast.copied'))
  }

  // Форматирование дат
  const formattedDate = track.created_at
    ? new Date(track.created_at).toLocaleDateString(i18n.language, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'Н/Д'

  const longFormatDate = track.created_at
    ? new Date(track.created_at).toLocaleDateString(i18n.language, {
        day: 'numeric',
        month: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
      })
    : 'Н/Д'

  // Сборка кнопок
  const getButtons = () => {
    const baseButtons = [
      {
        icon: <ClipboardCopy className="w-4 h-4" />,
        on_click: copyLink,
        className:
          'px-1 bg-level-2 border border-level-3/15 hover:bg-level-3/10 text-text-main',
        tooltip: t('playlist.track.copy'),
      },
      {
        icon: (
          <Bookmark
            className="w-4 h-4"
            fill={
              isSaved(track.yt_video_id) ? 'var(--color-text-main)' : 'none'
            }
          />
        ),
        on_click: toggleSave,
        className:
          'px-1 bg-level-2 border border-level-3/15 hover:bg-level-3/10 text-text-main',
        tooltip: t('playlist.track.save'),
      },
    ]

    if (btns_type === 'playlist') {
      return [
        {
          icon: <Play className="w-4 h-4" />,
          on_click: () => requestPlayNow(playlist.id, track.id),
          className:
            'px-1 bg-level-2 border border-level-3/15 hover:bg-level-3/10 text-text-main',
          tooltip: t('playlist.track.play'),
        },
        ...baseButtons,
        {
          icon: <Trash className="w-4 h-4" />,
          on_click: () => requestRemoveTrack(playlist.id, track.id, 'removed'),
          className:
            'px-1 bg-level-3/10 text-level-3 border border-level-3/30 hover:bg-level-3/20',
          tooltip: t('playlist.track.remove'),
        },
      ]
    }

    return [
      ...baseButtons,
      {
        icon: <Plus className="w-4 h-4" />,
        on_click: async () => {
          await requestAddTrack(
            playlist.id,
            `https://www.youtube.com/watch?v=${track.yt_video_id}`,
          )
        },
        className:
          'px-1 bg-level-2 border border-level-3/15 hover:bg-level-3/10 text-text-main',
        tooltip: t('playlist.track.add'),
      },
    ]
  }

  const buttons = getButtons()

  return (
    <div className="group relative w-[300px] md:w-[400px] rounded-(--rounded-std) overflow-hidden border border-level-3/20 bg-level-2 transition-all duration-300 shadow-md hover:shadow-lg">
      {/* Контейнер обложки и контента */}
      <div className="relative w-full h-[92px] p-2.5 flex flex-col justify-between z-10">
        {/* Задний фон обложки */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-100"
          style={{ backgroundImage: `url('${bgUrl}')` }}
        />

        {/* Темозависимый градиент: в темной теме затемняет, в светлой теме — мягко высветляет/приглушает */}
        <div className="absolute inset-0" />

        {/* Верхняя строка: Название и Заказчик */}
        <div className="relative z-10 w-full rounded-lg p-1 min-w-0 drop-shadow-[0_2px_3px_rgba(0,0,0,0.15)] shadow-inner  dark:drop-shadow-none bg-linear-to-b from-level-1/30 via-level-1/40 to-level-1/35 backdrop-blur-[1px]">
          <div
            className="text-[14px] font-semibold text-left truncate text-text-main tracking-wide"
            title={track.title}
          >
            {track.title}
          </div>

          {btns_type === 'playlist' && track.requester_nickname ? (
            <div className="text-[12px] text-text-placeholder text-left flex items-center gap-1 mt-0.5 font-semibold">
              <Person
                width={13}
                height={13}
                className="fill-text-main shrink-0"
              />
              <span className="truncate">{track.requester_nickname}</span>
            </div>
          ) : (
            <div className="h-4" />
          )}
        </div>

        {/* Нижняя строка: Индикаторы */}
        <div className="relative z-10 w-full flex justify-between items-center mt-2 font-mono text-[10px]">
          {/* Длительность */}
          <div
            title={t('playlist.track.duration')}
            className="px-1.5 py-0.5 rounded bg-level-1/90 text-text-main border border-level-3/20 font-bold cursor-help shadow-sm"
          >
            {formatTime(track.duration ? +track.duration : 0)}
          </div>

          {btns_type === 'playlist' && (
            <div className="flex gap-1.5">
              {/* Дата */}
              <div
                title={t('playlist.track.date', { date: longFormatDate })}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-level-2/80 border border-level-3/15 text-text-placeholder shadow-inner cursor-help"
              >
                <Calendar className="w-3 h-3 text-level-3/80" />
                <span className="text-text-secondary font-medium text-xs">
                  {formattedDate}
                </span>
              </div>

              {/* Приоритет */}
              <div
                title={t('playlist.track.priority')}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-level-2/90 border border-level-3/20 shadow-inner min-w-[35px] justify-center cursor-help"
              >
                <ArrowUpRight
                  className={`w-3 h-3 ${+track.priority > 0 ? 'text-level-3 animate-pulse' : 'text-text-placeholder'}`}
                />
                <span
                  className={`font-bold ${+track.priority > 0 ? 'text-text-main' : 'text-text-placeholder'}`}
                >
                  {track.priority}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Выезжающая панель управления снизу */}
      <div className="w-full max-h-0 opacity-0 group-hover:max-h-12 group-hover:opacity-100 flex gap-2 justify-center items-center bg-level-1/5 shadow-inner border-t border-level-3/10 transition-all duration-300 ease-in-out px-3 group-hover:py-2.5">
        {buttons.map((btn, index) => (
          <Btn
            key={index}
            text={btn.icon}
            className={`${btn.className} h-7 text-[12px] flex items-center justify-center transition-all rounded-md shadow-sm active:translate-y-[1px]`}
            onClick={btn.on_click}
            title={btn.tooltip}
          />
        ))}
      </div>
    </div>
  )
}
