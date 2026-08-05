import React from 'react'
import { Play } from 'lucide-react'
import {
  type SingleTrackItem,
  useSingleTrackStore,
} from '@/stores/singleTrackStore'
import { cn } from '@/lib/utils'

interface PlayTrackButtonProps {
  track: SingleTrackItem
  className?: string
  children?: React.ReactNode
}

export const PlayTrackButton: React.FC<PlayTrackButtonProps> = ({
  track,
  className,
  children,
}) => {
  const activeSingleTrack = useSingleTrackStore((s) => s.activeSingleTrack)
  const isPlaying = useSingleTrackStore((s) => s.isPlaying)
  const playSingleTrack = useSingleTrackStore((s) => s.playSingleTrack)

  const isCurrentTrack = activeSingleTrack?.yt_video_id === track.yt_video_id

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    playSingleTrack(track)
  }

  if (children) {
    return (
      <div onClick={handleClick} className={className}>
        {children}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`Play preview for ${track.title}`}
      className={cn(
        'size-8 rounded-full flex items-center justify-center transition-all cursor-pointer select-none',
        isCurrentTrack && isPlaying
          ? 'bg-accent text-text-main shadow-md scale-105'
          : 'bg-level-1/80 border border-accent/40 text-text-main hover:bg-accent hover:scale-105',
        className,
      )}
      title="Прослушать трек"
    >
      <Play className="size-4 fill-current ml-0.5" />
    </button>
  )
}

export default PlayTrackButton
