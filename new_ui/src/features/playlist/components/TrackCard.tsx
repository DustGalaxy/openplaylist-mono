import React, { useState } from 'react'
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
} from 'lucide-react' // замените на ваши импорты иконок
import { usePlaylist } from '../context/playlist-context'
import WarningModal from './warningModal'
import type { Track } from '@/types/playlist'
import Btn from '@/components/ui/my-btn'
import { formatTime } from '@/lib/utils'
import useMusicStore from '@/stores/musicStore'
import { useSavedStore } from '@/stores/savedStore'
import Person from '@/components/icons/icon-person'
import { usePlaybackStore } from '@/stores/playbackStore'

export type TrackCardType = 'playlist' | 'non-playlist' | 'now-playing'

interface TrackCardProps {
  track: Track
  type?: TrackCardType
  isDragging?: boolean
}

function TrackCardImpl({
  track,
  type = 'playlist',
  isDragging = false,
}: TrackCardProps) {
  const { t, i18n } = useTranslation()
  const playlist = usePlaylist()
  const [isOpen, setIsOpen] = useState(false)

  const { playNext, requestRemoveTrack, requestAddTrack } = useMusicStore()
  const { isSaved, addTrack, removeTrack } = useSavedStore()

  const isCurrentTrackPlaying = track.id === playlist.now_playing?.id
  const isNowPlayingType = type === 'now-playing'

  // Общая функция для добавления/удаления из закладок
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

  const onPlay = () => {
    useMusicStore.getState().requestPlayNow(playlist.id, track.id)
    usePlaybackStore.getState().setActivePlayback(playlist.id, 'owner')
  }

  // Общая функция для копирования ссылки
  const copyLink = async () => {
    await navigator.clipboard.writeText(
      `https://www.youtube.com/watch?v=${track.yt_video_id}`,
    )
    toast.success(t('common.toast.copied'))
  }

  // Общая функция запроса добавления трека в плейлист
  const handleAddTrackRequest = async () => {
    const loadingToast = toast.loading(t('common.toast.loading'))
    try {
      const result = await requestAddTrack(
        playlist.id,
        `https://www.youtube.com/watch?v=${track.yt_video_id}`,
      )
      toast.dismiss(loadingToast)
      if (result?.success || result === undefined) {
        toast.success(t('playlist.toast.requestAdded'))
      } else {
        toast.error(result?.message || t('playlist.toast.requestAddedFailed'))
      }
    } catch (error) {
      toast.dismiss(loadingToast)
      toast.error(t('playlist.toast.requestAddedFailed'))
    }
  }

  // Конфигурация кнопок в зависимости от типа карточки
  const getButtons = () => {
    const baseButtons = [
      {
        icon: <ClipboardCopy />,
        on_click: copyLink,
        className: 'px-1 bg-level-2',
        tooltip: t('playlist.track.copy'),
      },
      {
        icon: (
          <Bookmark
            fill={
              isSaved(track.yt_video_id) ? 'var(--color-text-main)' : 'none'
            }
          />
        ),
        on_click: toggleSave,
        className: 'px-1 bg-level-2',
        tooltip: isSaved(track.yt_video_id)
          ? t('playlist.track.unsave')
          : t('playlist.track.save'),
      },
    ]

    if (type === 'playlist') {
      return [
        {
          icon: <Play />,
          on_click: onPlay,
          className: 'px-1 bg-level-2',
          tooltip: t('playlist.track.play'),
        },
        ...baseButtons,
        {
          icon: <Trash />,
          on_click: () => requestRemoveTrack(playlist.id, track.id, 'removed'),
          className: 'px-1 bg-level-2',
          tooltip: t('playlist.track.remove'),
        },
      ]
    }

    if (type === 'non-playlist') {
      return [
        {
          icon: <Play />,
          on_click: () => console.log('Play clicked'),
          className: 'px-1 bg-level-2',
          tooltip: t('playlist.track.play'),
        },
        ...baseButtons,
        {
          icon: <Plus />,
          on_click: handleAddTrackRequest,
          className: 'px-1 bg-level-2',
          tooltip: t('playlist.track.add'),
        },
      ]
    }

    // Для 'now-playing' (Вариант 2)
    return [
      ...baseButtons,
      {
        icon: <Plus />,
        on_click: () => console.log('Add clicked'),
        className: 'px-1 bg-level-2',
        tooltip: t('playlist.track.add'),
      },
    ]
  }

  const buttons = getButtons()

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
    /* ВНЕШНИЙ КОНТЕЙНЕР — добавили правильную точку начала перспективы [perspective-origin:bottom] */
    <div
      className="relative w-full grid grid-cols-[1fr_auto] rounded-(--rounded-std) min-w-150 perspective-[1000px] perspective-origin-bottom h-19.5"
      style={{
        zIndex: isOpen ? 50 : 1,
        // При открытии z-index срабатывает мгновенно (0ms),
        // а при закрытии — удерживается 500ms и переключается только в самом конце
        transition: isOpen ? 'z-index 250ms' : 'z-index 200ms step-end',
        transitionBehavior: 'allow-discrete', // Позволяет анимировать дискретный z-index
      }}
    >
      {/* КОНТЕЙНЕР-ОБЕРТКА ДЛЯ ТЕНИ — добавили preserve-3d, чтобы передать перспективу внутрь */}
      <div
        className="relative w-full h-full min-w-0 transition-all duration-500 ease-in-out"
        style={{
          transformStyle: 'preserve-3d',
          boxShadow: isOpen ? '0 20px 30px -15px rgba(0, 0, 0, 0.6)' : 'none',
        }}
      >
        {/* ФИЗИЧЕСКИЙ КОРПУС КАРТОЧКИ */}
        <div
          className={`relative w-full h-full min-w-0 bg-level-2 origin-bottom rounded-sm ${
            isCurrentTrackPlaying
              ? 'border border-level-3'
              : 'border border-level-3/15'
          }`}
          style={{
            transform: isOpen ? 'rotateX(-55deg)' : 'rotateX(0deg)',
            transformStyle: 'preserve-3d',

            // Точная настройка анимации: трансформация идет 500ms, а тень начинается с задержкой в 150ms
            transition: isOpen
              ? 'transform 500ms ease-in-out, box-shadow 500ms ease-out 50ms'
              : 'transform 500ms ease-in-out, box-shadow 300ms ease-in',

            // Структура теней строго совпадает в обоих состояниях для плавной интерполяции
            boxShadow: isOpen
              ? 'inset 0 -60px 50px -30px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 15px 25px -5px rgba(0, 0, 0, 0.4)'
              : 'inset 0 0 50px -30px rgba(0, 0, 0, 0), inset 0 1px 0 rgba(255, 255, 255, 0), 0 0 0 0 rgba(0, 0, 0, 0)',
          }}
        >
          {/* 📟 ВЕРХНИЙ ТОРЕЦ */}
          <div
            className={`absolute top-0 left-0 right-0 h-8 
              bg-level-2 flex items-center px-4 gap-4
               transition-all duration-300 ease-out ring-1 ring-black/25 rounded-t-sm
            `}
            style={{
              transform: 'translateY(-100%) rotateX(90deg)',
              transformOrigin: 'bottom',
              // opacity: isOpen ? 1 : 0,
              pointerEvents: isOpen ? 'auto' : 'none',
            }}
          >
            {/* Источник */}
            <div
              title={t('playlist.track.source')}
              className="flex items-center gap-1.5 text-[11px] font-mono text-text-secondary select-all cursor-help"
            >
              <span className="text-[9px] text-text-placeholder uppercase tracking-wider">
                SRC:
              </span>
              <span className="text-text-main font-medium">
                {track.source || 'LINK'}
              </span>
            </div>

            <div className="w-px h-3 bg-white/10" />

            {/* Видео ID */}
            <div
              title={t('playlist.track.video_id')}
              className="flex items-center gap-1.5 text-[11px] font-mono text-text-secondary select-all cursor-help"
            >
              <span className="text-[9px] text-text-placeholder uppercase tracking-wider">
                VIDEO_ID:
              </span>
              <a
                href={`https://youtu.be/${track.yt_video_id}`}
                target="_blank"
                rel="noreferrer"
                className="text-level-3 hover:underline tracking-tight"
              >
                {track.yt_video_id}
              </a>
            </div>

            {/* Статус */}
            <div
              title={t('playlist.track.status')}
              className="flex items-center gap-1.5 text-[10px] font-mono ml-auto bg-level-1/40 px-2 py-0.5 rounded border border-white/5 cursor-help"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isCurrentTrackPlaying
                    ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]'
                    : isNowPlayingType
                      ? 'bg-text-secondary shadow-[0_0_6px_#10b981]'
                      : 'bg-[#b77f10] shadow-[0_0_6px_#b77f10]'
                } animate-pulse`}
              />
              <span
                className={`font-bold uppercase tracking-widest text-[9px] ${
                  isCurrentTrackPlaying
                    ? 'text-emerald-500'
                    : 'text-text-secondary'
                }`}
              >
                {isCurrentTrackPlaying ? 'READY' : 'WAITING'}
              </span>
            </div>
          </div>

          {/* ОСНОВНОЙ ФРОНТАЛЬНЫЙ ИНТЕРФЕЙС КАРТОЧКИ */}
          <div className="flex gap-3 ml-2 h-full pr-2 py-2 items-center min-w-0">
            {/* Превью трека */}
            <div
              className={`relative aspect-video shrink-0 rounded-(--rounded-std) h-18 overflow-hidden`}
            >
              <img
                className="w-full h-full object-cover"
                src={`https://img.youtube.com/vi/${track.yt_video_id}/mqdefault.jpg`}
                alt=""
              />
              <div
                title={t('playlist.track.duration')}
                className="absolute text-[12px] bottom-0.75 right-0.75 px-1.5 py-0.5 rounded-md font-mono bg-[#000000a7] text-white cursor-help"
              >
                {formatTime(track.duration ? +track.duration : 0)}
              </div>
            </div>

            {/* Контентная зона */}
            <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
              <div
                className="text-[18px] font-semibold text-left truncate text-text-main"
                title={track.title}
              >
                {track.title}
              </div>
              <div
                title={t('playlist.track.requester')}
                className="text-[14px] text-text-secondary flex gap-1 items-center font-medium cursor-help"
              >
                <Person
                  width={18}
                  height={18}
                  className="fill-text-main shrink-0"
                />
                <span className="truncate">{track.requester_nickname}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* НИЖНЯЯ СТРОКА (ПРАВАЯ СЕКЦИЯ КОНТЕЙНЕРА) */}
      <div
        className={`flex flex-col justify-between bg-level-2 h-full rounded-r-(--rounded-std) items-end ml-1 pb-2.5 pr-2 w-full self-end ${
          isNowPlayingType ? '' : 'rounded-sm'
        }`}
      >
        {/* Ретро индикаторы */}
        <div className="flex gap-2 text-xs mt-1 font-mono">
          {/* Дата */}
          <div
            title={t('playlist.track.date', { date: longFormatDate })}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-level-1/40 border border-white/5 text-text-placeholder shadow-inner cursor-help"
          >
            <Calendar className="w-3.5 h-3.5 text-level-3/70" />
            <span>{formattedDate}</span>
          </div>

          {/* Приоритет */}
          <div
            title={t('playlist.track.priority')}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-level-1/60 border border-white/5 shadow-inner min-w-16 justify-start cursor-help"
          >
            <ArrowUpRight
              className={`w-3.5 h-3.5 ${+track.priority > 0 ? 'text-level-3 animate-pulse' : 'text-text-placeholder'}`}
            />
            <span
              className={`font-bold ${+track.priority > 0 ? 'text-text-main' : 'text-text-placeholder'}`}
            >
              {track.priority}
            </span>
          </div>
        </div>

        {/* Секция интерактивных кнопок */}
        <div
          className={`flex items-center w-full ${isNowPlayingType ? 'gap-2 pl-4' : 'gap-1.5 justify-between'}`}
        >
          <div
            className={`flex gap-2 w-full ${isNowPlayingType ? '' : 'justify-between pl-4'}`}
          >
            {buttons.map((btn, index) => (
              <Btn
                key={index}
                className={`${btn.className} px-1 flex items-center justify-center`}
                onClick={btn.on_click}
                title={btn.tooltip}
              >
                {btn.icon}
              </Btn>
            ))}
            <WarningModal
              yt_video_id={track.yt_video_id}
              requester_nickname={track.requester_nickname}
              requester_platform={track.source}
              track_id={track.id}
            />
          </div>

          <div className="w-px h-6 bg-white/5 mx-1" />

          {/* Кнопка EJECT */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            title={t('playlist.track.eject')}
            className={`flex items-center justify-center gap-1 h-8 px-2.5 rounded-(--rounded-std) font-mono text-[11px] font-bold uppercase tracking-wider transition-all duration-150 border border-level-3/40 ${
              isOpen
                ? 'bg-level-1 text-level-3 shadow-inner translate-y-0.5'
                : 'bg-level-2 text-text-main hover:text-text-main shadow-[0_2px_0_0_var(--color-level-3)] active:translate-y-0.5 active:shadow-none'
            }`}
          >
            <span>{t('playlist.track.ejectBtn')}</span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-300 ${isOpen ? 'rotate-180 text-level-3' : ''}`}
            />
          </button>
        </div>
      </div>
    </div>
  )
}

function areEqual(prev: TrackCardProps, next: TrackCardProps) {
  return (
    prev.track.id === next.track.id &&
    prev.track.priority === next.track.priority &&
    prev.track.title === next.track.title &&
    prev.track.requester_nickname === next.track.requester_nickname &&
    prev.type === next.type &&
    prev.isDragging === next.isDragging
  )
}

const TrackCard = React.memo(TrackCardImpl, areEqual)
export default TrackCard
