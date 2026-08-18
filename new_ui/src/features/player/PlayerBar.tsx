import Player from './Player'
import { usePlaybackFeed } from './hooks/usePlaybackFeed'
import { useSingleTrackFeed } from './hooks/useSingleTrackFeed'
import { usePlaybackStore } from '@/stores/playbackStore'

export default function PlayerBar() {
  const activeMode = usePlaybackStore((s) => s.activeMode)
  const playlistFeed = usePlaybackFeed('player')
  const singleTrackFeed = useSingleTrackFeed()

  const feed = activeMode === 'single' ? singleTrackFeed : playlistFeed

  return (
    <div className="min-h-16 md:h-18 shrink-0 border-t border-accent/40 bg-level-2 px-2.5 sm:px-3 py-1.5 md:py-0 flex items-center shadow-lg">
      <Player feed={feed} />
    </div>
  )
}
