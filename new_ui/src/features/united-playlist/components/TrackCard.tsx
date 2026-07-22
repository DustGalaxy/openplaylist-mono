// src/features/playlist/components/TrackCard.tsx
import { Crown, Layers } from 'lucide-react'
import type { Track } from '@/stores/playlistStore/types'
import type { TrackCardAction } from '../lib/trackActions'
import { cn } from '@/lib/utils'
import Btn from '@/components/ui/my-btn'

export default function TrackCard({
  track,
  group,
  actions,
  isDragging,
  isNowPlaying,
}: {
  track: Track
  group?: 'vip' | 'regular' | 'background'
  actions: Array<TrackCardAction>
  isDragging?: boolean
  isNowPlaying?: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 p-2 rounded-md bg-level-2/50',
        isDragging && 'opacity-50',
        isNowPlaying && 'ring-1 ring-level-3',
      )}
    >
      <img
        src={`https://img.youtube.com/vi/${track.yt_video_id}/mqdefault.jpg`}
        alt=""
        className="h-10 aspect-video rounded-xs object-cover shrink-0 cursor-pointer"
        onClick={() =>
          actions.filter((a) => a.key === 'play')[0].onClick(track)
        }
      />

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
            onClick={() =>
              actions.filter((a) => a.key === 'play')[0].onClick(track)
            }
          >
            {track.title}
          </span>
        </div>
        <span className="truncate text-xs text-text-secondary">
          {track.requester_nickname}
        </span>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {actions.map((a) => (
          <Btn
            key={a.key}
            title={a.label}
            onClick={() => a.onClick(track)}
            className="p-1 size-7 rounded-sm"
          >
            <a.icon className="size-4" />
          </Btn>
        ))}
      </div>
    </div>
  )
}
