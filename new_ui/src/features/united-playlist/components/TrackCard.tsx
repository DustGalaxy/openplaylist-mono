// src/features/playlist/components/TrackCard.tsx
import { ArrowUpRight, Calendar, Crown, Layers } from 'lucide-react'

import { useTranslation } from 'react-i18next'
import TrackActions from './trackParts/TrackActions'
import { useTrackActions } from './trackParts/useTrackActions'
import WarningModal from './modals/warningModal'
import ReportModal from './modals/ReportModal'
import type { Track } from '@/types/playlist'
import { cn } from '@/lib/utils'
import { useFeatureTranslation } from '@/lib/i18n/featureTranslation'

export default function TrackCard({
  track,
  group,
  isDragging,
  isNowPlaying,
}: {
  track: Track
  group?: 'vip' | 'regular' | 'background'
  isDragging?: boolean
  isNowPlaying?: boolean
}) {
  const { t, i18n } = useFeatureTranslation()
  const { primary, secondary, play, openModal, closeModal } = useTrackActions(
    track,
    group,
  )
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
    <div
      className={cn(
        'flex items-center gap-2 p-2 rounded-md bg-level-2/50',
        isDragging && 'opacity-50',
        isNowPlaying && 'ring-1 ring-level-3',
      )}
    >
      <div className=" relative">
        <img
          src={`https://img.youtube.com/vi/${track.yt_video_id}/mqdefault.jpg`}
          alt=""
          className="h-10 aspect-video rounded-xs object-cover shrink-0 cursor-pointer"
          onClick={play}
        />
        <div
          title={t('playlist.track.duration')}
          className="absolute text-[10px] bottom-0.5 right-0.5 px-1 py-0.25 rounded-md font-mono bg-[#000000a7] text-white cursor-help"
        >
          {track.duration}
        </div>
      </div>

      <div className="min-w-0 flex-1 flex flex-col">
        <div className="flex items-center gap-1.5 min-w-0">
          {group === 'vip' && (
            <Crown className="size-3.5 text-level-3 shrink-0" />
          )}
          {group === 'background' && (
            <Layers className="size-3.5 text-text-placeholder shrink-0" />
          )}
          <span
            className="truncate text-sm text-text-main cursor-pointer"
            onClick={play}
          >
            {track.title}
          </span>
        </div>
        <span className="truncate text-xs text-text-secondary">
          {track.requester_nickname}
        </span>
      </div>
      <div className="flex flex-row gap-2">
        <div className="flex gap-2 text-xs items-start  font-mono">
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
            className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-level-1/60 border border-white/5 shadow-inner  justify-start cursor-help"
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
        <TrackActions primary={primary} secondary={secondary} />
        {openModal === 'block' && (
          <WarningModal track={track} open onOpenChange={closeModal} />
        )}
        {openModal === 'report' && (
          <ReportModal track={track} open onOpenChange={closeModal} />
        )}
      </div>
    </div>
  )
}
