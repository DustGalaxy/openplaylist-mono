import { useState } from 'react'
import { toast } from 'sonner'
import WarningModal from './warningModal'
import type { Track } from '@/types/playlist'
import { usePlaylist } from '@/features/playlist/context/playlist-context'
import Btn from '@/components/ui/my-btn'

import { useMusicStore } from '@/stores/musicStore'
import { formatTime } from '@/lib/utils'
import { useSavedStore } from '@/stores/savedStore'
import { useTranslation } from 'react-i18next'
import Person from '@/components/icons/icon-person'
import {
  ChevronDown,
  Calendar,
  ArrowUpRight,
  Play,
  Plus,
  Bookmark,
  ClipboardCopy,
  Trash,
} from 'lucide-react'

export default function OrderCard({
  track,
  btns_type = 'playlist',
}: {
  track: Track
  btns_type?: 'playlist' | 'non-playlist'
}) {
  const { t, i18n } = useTranslation()
  const playlist = usePlaylist()
  const [isOpen, setIsOpen] = useState(false)

  const { playNext, requestRemoveTrack, requestAddTrack } = useMusicStore()
  const { isSaved, addTrack, removeTrack } = useSavedStore()

  const playlistButtons = [
    {
      icon: <Play />,
      on_click: () => playNext(playlist, undefined, track),
      className: 'px-1 bg-level-2',
      tooltip: t('playlist.track.play'),
    },
    {
      icon: <ClipboardCopy />,
      on_click: async () => {
        await navigator.clipboard.writeText(
          'https://www.youtube.com/watch?v=' + track.yt_video_id,
        )
        toast.success(t('common.toast.copied'))
      },
      className: 'px-1 bg-level-2',
      tooltip: t('playlist.track.copy'),
    },
    {
      icon: <Bookmark fill={isSaved(track.yt_video_id) ? '#FFFFFF' : 'none'} />,
      on_click: () => {
        if (isSaved(track.yt_video_id)) {
          removeTrack(track.yt_video_id)
        } else {
          addTrack({
            yt_video_id: track.yt_video_id,
            title: track.title,
            duration: track.duration,
          })
        }
      },
      className: 'px-1 bg-level-2',
      tooltip: isSaved(track.yt_video_id)
        ? t('playlist.track.unsave')
        : t('playlist.track.save'),
    },
    {
      icon: <Trash />,
      on_click: () => requestRemoveTrack(playlist.id, track.id, 'removed'),
      className: 'px-1 bg-level-2',
      tooltip: t('playlist.track.remove'),
    },
  ]

  const nonPlaylistButtons = [
    {
      icon: <Play />,
      on_click: () => console.log('Play clicked'),
      className: 'px-1 bg-level-2',
      tooltip: t('playlist.track.play'),
    },
    {
      icon: <ClipboardCopy />,
      on_click: async () =>
        await navigator.clipboard
          .writeText('https://www.youtube.com/watch?v=' + track.yt_video_id)
          .then(() => toast.success(t('common.toast.copied'))),
      className: 'px-1 bg-level-2',
      tooltip: t('playlist.track.copy'),
    },
    {
      icon: <Bookmark fill={isSaved(track.yt_video_id) ? '#FFFFFF' : 'none'} />,
      on_click: () => {
        if (isSaved(track.yt_video_id)) {
          removeTrack(track.yt_video_id)
        } else {
          addTrack({
            yt_video_id: track.yt_video_id,
            title: track.title,
            duration: track.duration,
          })
        }
      },
      className: 'px-1 bg-level-2',
      tooltip: isSaved(track.yt_video_id)
        ? t('playlist.track.unsave')
        : t('playlist.track.save'),
    },
    {
      icon: <Plus />,
      on_click: async () => {
        const loadingToast = toast.loading(t('common.toast.loading'))
        try {
          const result = await requestAddTrack(
            playlist.id,
            'https://www.youtube.com/watch?v=' + track.yt_video_id,
          )
          toast.dismiss(loadingToast)
          if (result?.success || result === undefined) {
            toast.success(t('playlist.toast.requestAdded'))
          } else {
            toast.error(
              result?.message || t('playlist.toast.requestAddedFailed'),
            )
          }
        } catch (error) {
          toast.dismiss(loadingToast)
          toast.error(t('playlist.toast.requestAddedFailed'))
        }
      },
      className: 'px-1 bg-level-2',
      tooltip: t('playlist.track.add'),
    },
  ]

  const buttons =
    btns_type === 'playlist' ? playlistButtons : nonPlaylistButtons

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
    /* ВНЕШНИЙ КОНТЕЙНЕР */
    <div className="relative w-full grid grid-cols-[1fr_auto] h-[78px] rounded-(--rounded-std) min-w-[600px] [perspective:1200px]">
      {/* ФИЗИЧЕСКИЙ КОРПУС КАРТОЧКИ */}
      {/* Добавлен класс min-w-0, чтобы предотвратить распирание грид-ячейки длинным контентом */}
      <div
        className={`border ${
          track.id === playlist.now_playing?.id
            ? 'border-level-3'
            : 'border-level-3/15'
        } relative w-full h-full min-w-0 rounded-sm ${isOpen ? 'z-3' : 'z-2'} bg-level-2 transition-all duration-500 ease-in-out origin-bottom`}
        style={{
          transform: isOpen ? 'rotateX(-55deg)' : 'rotateX(0deg)',
          transformStyle: 'preserve-3d',
          boxShadow: isOpen ? '0 20px 40px rgba(0, 0, 0, 1)' : 'none',
        }}
      >
        {/* 📟 ВЕРХНИЙ ТОРЕЦ */}
        <div
          className="absolute top-0 left-0 right-0 ring-1 ring-black/25 h-[32px] bg-level-2  rounded-t-sm flex items-center px-4 gap-4 transition-all duration-300 ease-out"
          style={{
            transform: 'translateY(-100%) rotateX(90deg)',
            transformOrigin: 'bottom',
            opacity: isOpen ? 1 : 0,
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

          <div className="w-[1px] h-3 bg-white/10" />

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
            className="flex items-center gap-1.5 text-[10px] font-mono ml-auto bg-black/40 px-2 py-0.5 rounded border border-white/5 cursor-help"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                track.id === playlist.now_playing?.id
                  ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]'
                  : 'bg-[#b77f10] shadow-[0_0_6px_#b77f10]'
              } animate-pulse`}
            />
            <span
              className={`font-bold uppercase tracking-widest text-[9px] ${
                track.id === playlist.now_playing?.id
                  ? 'text-emerald-500'
                  : 'text-text-secondary'
              }`}
            >
              {track.id === playlist.now_playing?.id ? 'READY' : 'WAITING'}
            </span>
          </div>
        </div>

        {/* ОСНОВНОЙ ФРОНТАЛЬНЫЙ ИНТЕРФЕЙС КАРТОЧКИ */}
        <div className="flex gap-3 ml-2 h-full pr-2 py-2 items-center min-w-0">
          {/* Превью трека */}
          <div className="relative h-full aspect-video flex-shrink-0 rounded-(--rounded-std) overflow-hidden">
            <img
              className="w-full h-[72px] object-cover"
              src={`https://img.youtube.com/vi/${track.yt_video_id}/mqdefault.jpg`}
              alt=""
            />
            <div
              title={t('playlist.track.duration')}
              className="absolute text-[12px] bottom-[3px] right-[3px] px-1.5 py-0.5 rounded-md font-mono bg-[#000000a7] text-white cursor-help"
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
                className="text-text-placeholder flex-shrink-0"
              />
              <span className="truncate">{track.requester_nickname}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Нижная строка */}
      <div className="flex flex-col justify-between rounded-sm  bg-level-2 h-full rounded-r-(--rounded-std) items-end pb-2.5 pr-2 w-full self-end">
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
            className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-level-1/60 border border-white/5 shadow-inner min-w-[45px] justify-center cursor-help"
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
        <div className="flex gap-1.5 items-center justify-between w-full">
          <div className="flex gap-2 justify-between w-full pl-4">
            {buttons.map((btn, index) => (
              <Btn
                key={index}
                text={btn.icon}
                className={`${btn.className} px-1 flex items-center justify-center`}
                onClick={btn.on_click}
                title={btn.tooltip}
              />
            ))}
            <WarningModal
              yt_video_id={track.yt_video_id}
              requester_nickname={track.requester_nickname}
              requester_platform={track.source}
              track_id={track.id}
            />
          </div>

          <div className="w-[1px] h-6 bg-white/5 mx-1" />

          {/* Кнопка EJECT */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            title={t('playlist.track.eject')}
            className={`flex items-center justify-center gap-1 h-8 px-2.5 rounded-(--rounded-std) font-mono text-[11px] font-bold uppercase tracking-wider transition-all duration-150 border border-level-3/40 ${
              isOpen
                ? 'bg-level-1 text-level-3 shadow-inner translate-y-[2px]'
                : 'bg-level-2 text-text-main hover:text-text-main shadow-[0_2px_0_0_theme(colors.level-3)] active:translate-y-[2px] active:shadow-none'
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
