import React from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  ArrowUpRight,
  Calendar,
  ClipboardCopy,
  Pause,
  Play,
} from 'lucide-react'
import type { Track } from '@/types/playlist'
import Btn from '@/components/ui/my-btn'
import { computePriority, formatTime } from '@/lib/utils'
import Person from '@/components/icons/icon-person'
import { usePlaylist } from '@/features/playlist/context/playlist-context'
import DDPlaylistPicker from './DDPlaylistPicker.tsx'

interface ViewerTrackCardProps {
  track: Track
  isActive: boolean
  isPlaying: boolean
  isDragging?: boolean
  onPlay: () => void
}

function ViewerTrackCardImpl({
  track,
  isActive,
  isPlaying,
  isDragging = false,
  onPlay,
}: ViewerTrackCardProps) {
  const { t, i18n } = useTranslation()
  const playlist = usePlaylist()
  const copyLink = async () => {
    await navigator.clipboard.writeText(
      `https://www.youtube.com/watch?v=${track.yt_video_id}`,
    )
    toast.success(t('common.toast.copied'))
  }

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
  const priority = computePriority(track, playlist.settings)
  return (
    <div
      className={`relative w-full grid grid-cols-[1fr_auto] rounded-(--rounded-std) min-w-150 h-19.5 ${
        isDragging ? 'opacity-0' : ''
      }`}
    >
      <div
        className={`relative w-full h-full min-w-0 bg-level-2 rounded-sm ${
          isActive ? 'border border-level-3' : 'border border-level-3/15'
        }`}
      >
        <div className="flex gap-3 ml-2 h-full pr-2 py-2 items-center min-w-0">
          <div className="relative aspect-video shrink-0 rounded-(--rounded-std) h-18 overflow-hidden">
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

      <div className="flex flex-col justify-between bg-level-2 h-full rounded-r-(--rounded-std) items-end ml-1 pb-2.5 pr-2 w-full sm:min-w-50 self-end rounded-sm">
        <div className="flex gap-2 text-xs mt-1 font-mono">
          <div
            title={t('playlist.track.date', { date: longFormatDate })}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-level-1/40 border border-white/5 text-text-placeholder shadow-inner cursor-help"
          >
            <Calendar className="w-3.5 h-3.5 text-level-3/70" />
            <span>{formattedDate}</span>
          </div>
          <div
            title={t('playlist.track.priority')}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-level-1/60 border border-white/5 shadow-inner min-w-16 justify-center cursor-help"
          >
            <ArrowUpRight
              className={`w-3.5 h-3.5 ${+priority > 0 ? 'text-level-3 animate-pulse' : 'text-text-placeholder'}`}
            />
            <span
              className={`font-bold ${+priority > 0 ? 'text-text-main' : 'text-text-placeholder'}`}
            >
              {priority}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full  pl-4">
          <Btn
            text={<Play />}
            className="px-1 bg-level-2"
            onClick={onPlay}
            title={t(
              `playlist.tooltip.${isActive && isPlaying ? 'pause' : 'play'}`,
            )}
          />
          <Btn
            text={<ClipboardCopy />}
            className="px-1 bg-level-2"
            onClick={copyLink}
            title={t('playlist.track.copy')}
          />
          <DDPlaylistPicker track={track} />
        </div>
      </div>
    </div>
  )
}

function areEqual(prev: ViewerTrackCardProps, next: ViewerTrackCardProps) {
  return (
    prev.track.id === next.track.id &&
    prev.isActive === next.isActive &&
    prev.isPlaying === next.isPlaying &&
    prev.isDragging === next.isDragging
  )
}

const ViewerTrackCard = React.memo(ViewerTrackCardImpl, areEqual)
export default ViewerTrackCard
