import React from 'react'
import { useTranslation } from 'react-i18next'
import { ExternalLink, Link, Music, Play } from 'lucide-react'
import { toast } from 'sonner'
import type { TopTrack } from '../../types'
import { formatSecondsToReadable } from './KpiCard'
import { cn } from '@/lib/utils'
import PlayTrackButton from '@/features/player/components/PlayTrackButton'

interface TopTracksWidgetProps {
  tracks: TopTrack[]
  title?: string
  limit?: number
  isLoading?: boolean
  className?: string
}

export const TopTracksWidget: React.FC<TopTracksWidgetProps> = ({
  tracks = [],
  title,
  limit = 5,
  isLoading = false,
  className,
}) => {
  const { t } = useTranslation()
  const displayTracks = tracks.slice(0, limit)

  const copyLink = (track: TopTrack) => {
    navigator.clipboard.writeText(
      `https://www.youtube.com/watch?v=${track.yt_video_id}`,
    )
    toast.success(t('playlist.toast.linkCopied', 'Link copied'))
  }

  return (
    <div
      className={cn(
        'rounded-xl border border-accent/50 bg-level-2 p-4 flex flex-col gap-3',
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-text-main flex items-center gap-2">
          <Music className="size-4 text-accent" />
          {title || t('stats.topTracks.title', 'Top Tracks')}
        </h3>
        <span className="text-xs text-text-secondary font-mono font-medium">
          {tracks.length} {t('stats.topTracks.total', 'tracks')}
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-14 bg-level-1 animate-pulse rounded-lg border border-accent/30"
            />
          ))}
        </div>
      ) : displayTracks.length === 0 ? (
        <div className="py-6 text-center text-xs text-text-secondary bg-level-1/40 rounded-lg border border-dashed border-accent/40">
          {t('stats.topTracks.empty', 'No track statistics available')}
        </div>
      ) : (
        <div className="space-y-2">
          {displayTracks.map((track, idx) => {
            const ytUrl = `https://www.youtube.com/watch?v=${track.yt_video_id}`
            const thumbUrl = `https://img.youtube.com/vi/${track.yt_video_id}/mqdefault.jpg`
            const trackItem = {
              yt_video_id: track.yt_video_id,
              title: track.title,
              duration: track.total_duration,
            }

            return (
              <div
                key={`${track.yt_video_id}-${idx}`}
                className="group flex items-center justify-between gap-3 p-2 rounded-lg bg-level-1 border border-accent/40 hover:border-accent/80 transition-all"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {/* Rank badge */}
                  <span
                    className={cn(
                      'size-6 rounded-full shrink-0 text-xs font-bold flex items-center justify-center font-mono',
                      idx === 0
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        : idx === 1
                          ? 'bg-slate-400/20 text-slate-300 border border-slate-400/40'
                          : idx === 2
                            ? 'bg-amber-700/20 text-amber-600 border border-amber-700/40'
                            : 'bg-level-2 text-text-secondary border border-accent/30',
                    )}
                  >
                    {idx + 1}
                  </span>

                  {/* Thumbnail with preview play button */}
                  <div className="relative size-10 rounded-md overflow-hidden bg-level-2 shrink-0 group/thumb">
                    <img
                      src={thumbUrl}
                      alt={track.title}
                      className="size-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        ;(e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                    <PlayTrackButton
                      track={trackItem}
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity text-white cursor-pointer"
                    >
                      <Play className="size-4 fill-white" />
                    </PlayTrackButton>
                  </div>

                  {/* Title & Info */}
                  <div className="min-w-0 flex-1">
                    <PlayTrackButton
                      track={trackItem}
                      className="inline-block max-w-full"
                    >
                      <span
                        className="text-xs font-semibold text-text-main hover:text-accent transition-colors truncate block cursor-pointer"
                        title={track.title}
                      >
                        {track.title}
                      </span>
                    </PlayTrackButton>
                    <div className="flex items-center gap-2 text-[11px] text-text-secondary mt-0.5">
                      <span>
                        {track.count} {t('stats.topTracks.orders', 'orders')}
                      </span>
                      {track.total_duration > 0 && (
                        <>
                          <span>•</span>
                          <span>
                            {formatSecondsToReadable(track.total_duration)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions: Copy Link & External Link */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => copyLink(track)}
                    className="p-1.5 rounded-md text-text-secondary hover:text-text-main hover:bg-level-2 transition-colors shrink-0 cursor-pointer"
                    title={t('playlist.track.actions.copyLink', 'Copy link')}
                  >
                    <Link className="size-3.5" />
                  </button>
                  <a
                    href={ytUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-md text-text-secondary hover:text-text-main hover:bg-level-2 transition-colors shrink-0"
                    title={t('stats.topTracks.openLink', 'Open link')}
                  >
                    <ExternalLink className="size-3.5" />
                  </a>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default TopTracksWidget
