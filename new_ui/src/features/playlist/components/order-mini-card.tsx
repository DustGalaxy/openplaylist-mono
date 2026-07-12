import React, { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  ArrowUpRight,
  Bookmark,
  Calendar,
  ChevronDown,
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
import useWindowDimensions from '@/hooks/useWindowDimensions'

interface OrderMiniCardProps {
  track: any // Track | SavedTrack
  btns_type?: 'playlist' | 'non-playlist'
  isDragging?: boolean
}

function OrderMiniCardImpl({
  track,
  btns_type = 'playlist',
  isDragging = false,
}: OrderMiniCardProps) {
  const { t, i18n } = useTranslation()
  const playlist = usePlaylist()
  const bgUrl = `https://img.youtube.com/vi/${track.yt_video_id}/mqdefault.jpg`
  const [actionsOpen, setActionsOpen] = useState(false)
  const { height, width } = useWindowDimensions()
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

  // Toggle action panel (tap on mobile, hover still works on desktop via group-hover)
  const handleCardTap = useCallback(() => {
    if (width < 768) {
      setActionsOpen((prev) => !prev)
    }
  }, [])

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
    <div
      className={`group relative w-full rounded-(--rounded-std) overflow-hidden border border-level-3/20 bg-level-2 shadow-md hover:shadow-lg ${
        isDragging ? '' : 'transition-all duration-300'
      }`}
    >
      <div
        className="relative w-full h-23 p-2.5 flex flex-col justify-between z-10 cursor-pointer select-none"
        onClick={handleCardTap}
      >
        <div
          className={`absolute inset-0 bg-cover bg-center ${
            isDragging
              ? ''
              : 'transition-transform duration-500 group-hover:scale-100'
          }`}
          style={{ backgroundImage: `url('${bgUrl}')` }}
        />

        {/* Темозависимый градиент */}
        <div className="absolute inset-0" />

        {/* Верхняя строка: Название и Заказчик */}
        <div className="relative z-10 w-full rounded-lg p-1 min-w-0 drop-shadow-[0_2px_3px_rgba(0,0,0,0.15)] shadow-inner dark:drop-shadow-none bg-linear-to-b from-level-1/30 via-level-1/40 to-level-1/35 backdrop-blur-[1px]">
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

        {/* Нижняя строка: Индикаторы + tap affordance chevron */}
        <div className="relative z-10 w-full flex justify-between items-center mt-2 font-mono text-[10px]">
          {/* Длительность */}
          <div
            title={t('playlist.track.duration')}
            className="px-1.5 py-0.5 rounded bg-level-1/90 text-text-main border border-level-3/20 font-bold cursor-help shadow-sm"
          >
            {formatTime(track.duration ? +track.duration : 0)}
          </div>

          <div className="flex gap-1.5 items-center">
            {btns_type === 'playlist' && (
              <>
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
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-level-2/90 border border-level-3/20 shadow-inner min-w-8.75 justify-center cursor-help"
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
              </>
            )}

            {/* Tap affordance chevron */}
            <ChevronDown
              style={{ display: width < 768 ? 'block' : 'none' }}
              className={`w-4 h-4 text-text-placeholder transition-transform duration-300 ${actionsOpen ? 'rotate-180' : ''}`}
            />
          </div>
        </div>
      </div>

      {/* Панель управления — opens on tap (mobile) OR hover (desktop) */}
      <div
        className={`w-full flex gap-2 justify-center items-center bg-level-1/5 shadow-inner border-t border-level-3/10 transition-all duration-300 ease-in-out px-3 overflow-hidden ${
          actionsOpen
            ? 'max-h-14 opacity-100 py-2.5'
            : 'max-h-0 opacity-0 group-hover:max-h-14 group-hover:opacity-100 group-hover:py-2.5'
        }`}
      >
        {buttons.map((btn, index) => (
          <Btn
            key={index}
            className={`${btn.className} h-9 w-9 text-[12px] flex items-center justify-center transition-all rounded-md shadow-sm active:translate-y-px`}
            onClick={(e) => {
              e.stopPropagation()
              btn.on_click()
            }}
            title={btn.tooltip}
          >
            {btn.icon}
          </Btn>
        ))}
      </div>
    </div>
  )
}

function areEqual(prev: OrderMiniCardProps, next: OrderMiniCardProps) {
  return (
    prev.track.id === next.track.id &&
    prev.track.priority === next.track.priority &&
    prev.track.title === next.track.title &&
    prev.track.requester_nickname === next.track.requester_nickname &&
    prev.btns_type === next.btns_type &&
    prev.isDragging === next.isDragging
  )
}

const OrderMiniCard = React.memo(OrderMiniCardImpl, areEqual)
export default OrderMiniCard
