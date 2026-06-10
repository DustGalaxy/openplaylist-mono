import { useState } from 'react'
import { toast } from 'sonner'
import WarningModal from './warningModal'
import type { Track } from '@/types/playlist'
import { usePlaylist } from '@/features/playlist/context/playlist-context'
import Btn from '@/components/ui/my-btn'

import Play from '@/components/icons/icon-play'
import Add from '@/components/icons/icon-add'
import Copy from '@/components/icons/icon-copy'
import Trash from '@/components/icons/icon-trash'
import Person from '@/components/icons/icon-person'
import Save from '@/components/icons/icon-save'
import { useMusicStore } from '@/stores/musicStore'
import { formatTime } from '@/lib/utils'
import { useSavedStore } from '@/stores/savedStore'
import { useTranslation } from 'react-i18next'

import { ChevronDown, Calendar, ArrowUpRight } from 'lucide-react'

export default function OrderCard({
  track,
  btns_type = 'playlist',
}: {
  track: Track
  btns_type?: 'playlist' | 'non-playlist'
}) {
  const { t } = useTranslation()
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
      icon: <Copy />,
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
      icon: <Save fill={isSaved(track.yt_video_id) ? '#FFFFFF' : 'none'} />,
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
      tooltip: isSaved(track.yt_video_id) ? t('playlist.track.unsave') : t('playlist.track.save'),
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
      icon: <Copy />,
      on_click: async () =>
        await navigator.clipboard
          .writeText('https://www.youtube.com/watch?v=' + track.yt_video_id)
          .then(() => toast.success(t('common.toast.copied'))),
      className: 'px-1 bg-level-2',
      tooltip: t('playlist.track.copy'),
    },
    {
      icon: <Save fill={isSaved(track.yt_video_id) ? '#FFFFFF' : 'none'} />,
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
      tooltip: isSaved(track.yt_video_id) ? t('playlist.track.unsave') : t('playlist.track.save'),
    },
    {
      icon: <Add />,
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
    ? new Date(track.created_at).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'Н/Д'
    
  return (
    /* ВНЕШНИЙ КОНТЕЙНЕР */
    <div className="relative w-full h-[100px] min-w-[600px] [perspective:1200px]">
      {/* ФИЗИЧЕСКИЙ КОРПУС КАРТОЧКИ */}
      <div
        className={`relative w-full h-full bg-level-2 rounded-(--rounded-std) transition-all duration-300 ease-out origin-bottom ${
          track.id === playlist.now_playing?.id
            ? 'ring-3 ring-level-3'
            : 'border border-level-3/15'
        }`}
        style={{
          transform: isOpen ? 'rotateX(-60deg)' : 'rotateX(0deg)',
          transformStyle: 'preserve-3d',
          boxShadow: isOpen
            ? '0 20px 40px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255,255,255,0.1)'
            : 'none',
        }}
      >
        {/* 📟 ВЕРХНИЙ ТОРЕЦ */}
        <div
          className="absolute top-0 left-0 right-0 h-[32px] bg-level-2/90 border-b border-level-3/30 rounded-t-(--rounded-std) flex items-center px-4 gap-4 transition-all duration-300 ease-out"
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
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981] animate-pulse" />
            <span className="text-emerald-400 font-bold uppercase tracking-widest text-[9px]">
              READY
            </span>
          </div>
        </div>

        {/* ОСНОВНОЙ ФРОНТАЛЬНЫЙ ИНТЕРФЕЙС КАРТОЧКИ */}
        <div className="grid grid-cols-[150px_1fr] gap-2 h-full pr-2">
          {/* Превью трека */}
          <div className="h-full w-full flex items-center justify-center">
            <div className="relative h-[72px] block object-cover aspect-video rounded-(--rounded-std)">
              <img
                className="h-[72px] aspect-video rounded-(--rounded-std) block object-cover"
                src={`https://img.youtube.com/vi/${track.yt_video_id}/mqdefault.jpg`}
              />
              <div 
                title={t('playlist.track.duration')} 
                className="absolute text-[12px] bottom-[3px] right-[3px] px-1.5 py-0.5 rounded-md font-mono bg-[#000000a7] text-text-main cursor-help"
              >
                {formatTime(track.duration ? +track.duration : 0)}
              </div>
            </div>
          </div>

          {/* Контентная зона */}
          <div className="grid grid-rows-[auto_1fr] pt-2 w-full overflow-hidden">
            <div className="flex justify-between items-start w-full pr-2">
              <div className="text-[18px] font-semibold text-left truncate max-w-[55%]">
                {track.title}
              </div>

              {/* Ретро индикаторы */}
              <div className="flex gap-2 text-xs font-mono">
                {/* Дата */}
                <div 
                  title={t('playlist.track.date')} 
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
            </div>

            {/* Нижная строка */}
            <div className="flex justify-between items-end pb-2.5 pr-2 w-full self-end">
              {/* Заказчик трека */}
              <div 
                title={t('playlist.track.requester')} 
                className="text-[14px] text-text-secondary text-left flex gap-1 items-center font-medium cursor-help"
              >
                <Person
                  width={18}
                  height={18}
                  className="text-text-placeholder"
                />
                <span className="truncate max-w-[120px]">
                  {track.requester_nickname}
                </span>
              </div>

              <div className="flex gap-1.5 items-center">
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

                <div className="w-[1px] h-6 bg-white/5 mx-1" />

                {/* Кнопка EJECT */}
                <button
                  onClick={() => setIsOpen(!isOpen)}
                  title={t('playlist.track.eject')}
                  className={`
                    flex items-center justify-center gap-1 h-8 px-2.5 rounded-(--rounded-std)
                    font-mono text-[11px] font-bold uppercase tracking-wider transition-all duration-150
                    border border-level-3/40
                    ${
                      isOpen
                        ? 'bg-level-1 text-level-3 shadow-inner translate-y-[2px]'
                        : 'bg-level-2 text-text-main hover:text-text-main shadow-[0_2px_0_0_rgb(245,106,25)] active:translate-y-[2px] active:shadow-none'
                    }
                  `}
                >
                  <span>Eject</span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-300 ${isOpen ? 'rotate-180 text-level-3' : ''}`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}