import React from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { ArrowUpRight, Calendar, ClipboardCopy } from 'lucide-react'
import type { ClientPlaylist, Track } from '@/types/playlist'
import Btn from '@/components/ui/my-btn'

import { computePriority, formatTime } from '@/lib/utils'
import Person from '@/components/icons/icon-person'

interface ViewTrackCardProps {
  track: Track
  playlist: ClientPlaylist | null
  now_playing?: boolean
}

export default function ViewTrackCard({
  track,
  playlist,
  now_playing = false,
}: ViewTrackCardProps) {
  const { t, i18n } = useTranslation()

  if (!playlist) return null

  const bgUrl = `https://img.youtube.com/vi/${track.yt_video_id}/mqdefault.jpg`
  const isCurrentTrack = track.id === playlist.now_playing?.id && !now_playing

  // Вычисление приоритета
  const priorityNumber =
    typeof track.priority === 'number'
      ? track.priority
      : computePriority(track.priority, playlist.settings)

  // Общая логика копирования ссылки
  const copyLink = async () => {
    await navigator.clipboard.writeText(
      `https://www.youtube.com/watch?v=${track.yt_video_id}`,
    )
    toast.success(t('common.toast.copied'))
  }

  const buttons = [
    {
      icon: <ClipboardCopy className="w-4 h-4" />,
      on_click: copyLink,
      className:
        'px-1 bg-level-2 border border-level-3/15 hover:bg-level-3/10 text-text-main',
      tooltip: t('playlist.track.copy'),
    },
  ]

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

  return (
    <div className="@container w-full">
      {/* ================= МОБИЛЬНЫЙ РЕЖИМ (< 530px) ================= */}
      <div className="[@container_(width_>=_530px)]:hidden w-full flex rounded-(--rounded-std) overflow-hidden border border-level-3/15 bg-level-2 shadow-md gap-2 p-2">
        <div className="relative w-full h-[92px] p-2 flex flex-col justify-between rounded-(--rounded-std) overflow-hidden">
          {/* Обложка */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url('${bgUrl}')` }}
          />
          {/* Темозависимый градиент-подложка для читаемости */}
          <div className="absolute inset-0 bg-gradient-to-b from-level-1/80 via-level-1/65 to-level-1/85 backdrop-blur-[1px]" />

          {/* Контент: Название и Заказчик */}
          <div className="relative z-10 w-full min-w-0 drop-shadow-[0_1px_2px_rgba(0,0,0,0.15)] dark:drop-shadow-none">
            <div className="text-[15px] font-bold text-left truncate text-text-main tracking-wide">
              {track.title}
            </div>
            <div className="text-[12px] text-text-secondary text-left flex items-center gap-1 mt-0.5 font-semibold">
              <Person
                width={13}
                height={13}
                className="fill-text-secondary text-text-secondary shrink-0"
              />
              <span className="truncate">{track.requester_nickname}</span>
            </div>
          </div>

          {/* Индикаторы */}
          <div className="relative z-10 w-full flex justify-between items-center font-mono text-[10px]">
            <div className="px-1.5 py-0.5 rounded bg-level-1/90 text-text-main border border-level-3/20 font-bold shadow-sm">
              {formatTime(track.duration ? +track.duration : 0)}
            </div>

            <div className="flex gap-1.5">
              {/* Дата */}
              <div
                title={t('playlist.track.date', { date: longFormatDate })}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-level-2/80 border border-level-3/15 text-text-placeholder shadow-inner cursor-help"
              >
                <Calendar className="w-3 h-3 text-level-3/80" />
                <span className="text-text-secondary font-medium">
                  {formattedDate}
                </span>
              </div>

              {/* Приоритет */}
              <div
                title={t('playlist.track.priority')}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-level-2/90 border border-level-3/20 shadow-inner min-w-[35px] justify-center cursor-help"
              >
                <ArrowUpRight
                  className={`w-3 h-3 ${priorityNumber > 0 ? 'text-level-3 animate-pulse' : 'text-text-placeholder'}`}
                />
                <span
                  className={`font-bold ${priorityNumber > 0 ? 'text-text-main' : 'text-text-placeholder'}`}
                >
                  {priorityNumber}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Панель кнопок сбоку (вертикальная) */}
        <div className="flex flex-col justify-center items-center px-1">
          {buttons.map((btn, index) => (
            <Btn
              key={index}
              className={`${btn.className} h-8 w-8 flex items-center justify-center rounded-md shadow-sm`}
              onClick={btn.on_click}
              title={btn.tooltip}
            >
              {btn.icon}
            </Btn>
          ))}
        </div>
      </div>

      {/* ================= ДЕСКТОПНЫЙ РЕЖИМ (>= 530px) ================= */}
      <div
        className={`h-[116px] min-w-[530px] w-full pr-2 hidden [@container_(width_>=_530px)]:block`}
      >
        <div
          className={`grid bg-level-2 border border-level-3/15 rounded-(--rounded-std) grid-cols-[140px_1fr] gap-4 h-[100px] p-2.5 items-center transition-all duration-300 ${
            isCurrentTrack
              ? 'ring-2 ring-level-3 shadow-md'
              : 'shadow-sm hover:shadow-md'
          }`}
        >
          {/* Контейнер превью картинки */}
          <div className="relative h-[80px] w-full block aspect-video rounded-(--rounded-std) overflow-hidden shadow-inner bg-level-1">
            <img
              className="h-full w-full block object-cover"
              src={bgUrl}
              alt=""
            />
            <div className="absolute text-[10px] font-mono font-bold bottom-1 right-1 px-1.5 py-0.5 rounded bg-[#000000a7] text-white border border-white/5">
              {formatTime(track.duration ? +track.duration : 0)}
            </div>
          </div>

          {/* Информация и панель управления */}
          <div className="flex flex-col justify-between h-full w-full min-w-0">
            {/* Название и заказчик */}
            <div className="w-full min-w-0 text-left">
              <div
                className="text-[16px] font-bold text-text-main truncate tracking-wide"
                title={track.title}
              >
                {track.title}
              </div>
              <div className="text-[13px] text-text-secondary flex gap-1 items-center mt-0.5 font-medium">
                <Person
                  width={14}
                  height={14}
                  className="fill-text-secondary text-text-secondary shrink-0"
                />
                <span className="truncate">{track.requester_nickname}</span>
              </div>
            </div>

            {/* Панель кнопок + Ретро индикаторы */}
            <div className="flex justify-between items-center w-full mt-auto font-mono text-[11px]">
              {/* Кнопки действий */}
              <div className="flex gap-1.5">
                {buttons.map((btn, index) => (
                  <Btn
                    key={index}
                    className={`${btn.className} h-7 px-2.5 flex items-center justify-center rounded-md text-[12px] shadow-sm`}
                    onClick={btn.on_click}
                    title={btn.tooltip}
                  >
                    {btn.icon}
                  </Btn>
                ))}
              </div>

              {/* Правая часть: метаданные */}
              <div className="flex gap-2 mr-1">
                {/* Дата */}
                <div
                  title={t('playlist.track.date', { date: longFormatDate })}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-level-1/40 border border-level-3/10 text-text-placeholder shadow-inner cursor-help"
                >
                  <Calendar className="w-3.5 h-3.5 text-level-3/70" />
                  <span className="text-text-secondary font-medium">
                    {formattedDate}
                  </span>
                </div>

                {/* Приоритет */}
                <div
                  title={t('playlist.track.priority')}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-level-1/60 border border-level-3/15 shadow-inner min-w-[45px] justify-center cursor-help"
                >
                  <ArrowUpRight
                    className={`w-3.5 h-3.5 ${priorityNumber > 0 ? 'text-level-3 animate-pulse' : 'text-text-placeholder'}`}
                  />
                  <span
                    className={`font-bold ${priorityNumber > 0 ? 'text-text-main' : 'text-text-placeholder'}`}
                  >
                    {priorityNumber}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
