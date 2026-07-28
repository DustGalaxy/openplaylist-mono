import React from 'react'
import {
  ArrowUpRight,
  Calendar,
  ChevronDown,
  Crown,
  Layers,
  Play,
} from 'lucide-react'
import WarningModal from '../modals/warningModal'
import ReportModal from '../modals/ReportModal'
import TrackActions from './TrackActions'
import { useTrackActions } from './useTrackActions'
import type { TrackCardAction } from './types'
import type { Track } from '@/types/playlist'
import { cn } from '@/lib/utils'
import { useFeatureTranslation } from '@/lib/i18n/featureTranslation'
import useWindowDimensions from '@/hooks/useWindowDimensions'

interface MiniTrackCardProps {
  track: Track
  group?: 'vip' | 'regular' | 'background'
  isDragging?: boolean
  isNowPlaying?: boolean
}

function MiniTrackCardImpl({
  track,
  group,
  isDragging = false,
  isNowPlaying = false,
}: MiniTrackCardProps) {
  const { t, i18n } = useFeatureTranslation()
  const { width } = useWindowDimensions()
  const [actionsOpen, setActionsOpen] = React.useState(false)
  const { primary, secondary, play, openModal, closeModal } = useTrackActions(
    track,
    group ?? 'regular',
  )

  const bgUrl = `https://img.youtube.com/vi/${track.yt_video_id}/mqdefault.jpg`

  // Tap toggles action bar on mobile; desktop relies on group-hover
  const handleCardTap = () => {
    if (width < 768) setActionsOpen((prev) => !prev)
  }

  const formattedDate = track.created_at
    ? new Date(track.created_at).toLocaleDateString(
        i18n.language === 'ua' ? 'uk-UA' : i18n.language,
        {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        },
      )
    : 'Н/Д'

  const longFormatDate = track.created_at
    ? new Date(track.created_at).toLocaleDateString(
        i18n.language === 'ua' ? 'uk-UA' : i18n.language,
        {
          day: 'numeric',
          month: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
          second: 'numeric',
        },
      )
    : 'Н/Д'

  // play живёт только в мини-карточке — в обычном TrackCard play уже висит на клике по картинке/тайтлу
  const miniPrimary: Array<TrackCardAction> = [
    {
      key: 'play',
      icon: Play,
      label: t('playlist.track.actions.play', 'Play'),
      onClick: play,
    },
    ...primary,
  ]

  return (
    <div
      className={cn(
        'group relative w-full rounded-(--rounded-std) overflow-hidden border border-level-3/20 bg-level-2 shadow-md hover:shadow-lg',
        !isDragging && 'transition-all duration-300',
        isNowPlaying && 'ring-1 ring-level-3',
      )}
    >
      <div
        className="relative w-full h-23 p-2.5 flex flex-col justify-between z-10 cursor-pointer select-none"
        onClick={handleCardTap}
      >
        <div
          className={cn(
            'absolute inset-0 bg-cover bg-center',
            !isDragging &&
              'transition-transform duration-500 group-hover:scale-100',
          )}
          style={{ backgroundImage: `url('${bgUrl}')` }}
        />
        <div className="absolute inset-0" />

        {/* Верхняя строка: группа + название + заказчик */}
        <div className="relative z-10 w-full rounded-lg p-1 min-w-0 drop-shadow-[0_2px_3px_rgba(0,0,0,0.15)] shadow-inner dark:drop-shadow-none bg-linear-to-b from-level-1/30 via-level-1/40 to-level-1/35 backdrop-blur-[1px]">
          <div className="flex items-center gap-1.5 min-w-0">
            {group === 'vip' && (
              <Crown className="size-3.5 text-level-3 shrink-0" />
            )}
            {group === 'background' && (
              <Layers className="size-3.5 text-text-placeholder shrink-0" />
            )}
            <div
              className="text-[14px] font-semibold text-left truncate text-text-main tracking-wide"
              title={track.title}
            >
              {track.title}
            </div>
          </div>

          {track.requester_nickname ? (
            <div className="text-[12px] text-text-placeholder text-left truncate mt-0.5 font-semibold">
              {track.requester_nickname}
            </div>
          ) : (
            <div className="h-4" />
          )}
        </div>

        {/* Нижняя строка: индикаторы + affordance chevron */}
        <div className="relative z-10 w-full flex justify-between items-center mt-2 font-mono text-[10px]">
          <div
            title={t('playlist.track.duration')}
            className="px-1.5 py-0.5 rounded  bg-[#000000a7] text-white font-mono cursor-help"
          >
            {track.duration}
          </div>

          <div className="flex gap-1.5 items-center">
            <div
              title={t('playlist.track.date', { date: longFormatDate })}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-level-2/80 border border-level-3/15 text-text-placeholder shadow-inner cursor-help"
            >
              <Calendar className="w-3 h-3 text-level-3/80" />
              <span className="text-text-secondary font-medium text-xs">
                {formattedDate}
              </span>
            </div>

            <div
              title={t('playlist.track.priority')}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-level-2/90 border border-level-3/20 shadow-inner min-w-8.75 justify-center cursor-help"
            >
              <ArrowUpRight
                className={cn(
                  'w-3 h-3',
                  track.priority > 0
                    ? 'text-level-3 animate-pulse'
                    : 'text-text-placeholder',
                )}
              />
              <span
                className={cn(
                  'font-bold',
                  track.priority > 0
                    ? 'text-text-main'
                    : 'text-text-placeholder',
                )}
              >
                {track.priority}
              </span>
            </div>

            <ChevronDown
              style={{ display: width < 768 ? 'block' : 'none' }}
              className={cn(
                'w-4 h-4 text-text-placeholder transition-transform duration-300',
                actionsOpen && 'rotate-180',
              )}
            />
          </div>
        </div>
      </div>

      {/* Панель действий — тап (мобайл) / hover (десктоп) */}
      <div
        className={cn(
          'w-full flex gap-2 justify-center items-center bg-level-1/5 shadow-inner border-t border-level-3/10 transition-all duration-300 ease-in-out px-3 overflow-hidden',
          actionsOpen
            ? 'max-h-14 opacity-100 py-2.5'
            : 'max-h-0 opacity-0 group-hover:max-h-14 group-hover:opacity-100 group-hover:py-2.5',
        )}
      >
        <TrackActions
          primary={miniPrimary}
          secondary={secondary}
          track={track}
        />
      </div>

      {openModal === 'block' && (
        <WarningModal track={track} open onOpenChange={closeModal} />
      )}
      {openModal === 'report' && (
        <ReportModal track={track} open onOpenChange={closeModal} />
      )}
    </div>
  )
}

function areEqual(prev: MiniTrackCardProps, next: MiniTrackCardProps) {
  return (
    prev.track.id === next.track.id &&
    prev.track.priority === next.track.priority &&
    prev.track.title === next.track.title &&
    prev.track.requester_nickname === next.track.requester_nickname &&
    prev.group === next.group &&
    prev.isDragging === next.isDragging &&
    prev.isNowPlaying === next.isNowPlaying
  )
}

const MiniTrackCard = React.memo(MiniTrackCardImpl, areEqual)
export default MiniTrackCard
