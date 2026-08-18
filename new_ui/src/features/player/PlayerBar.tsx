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
    <div className="min-h-20 md:h-22 shrink-0 border-t border-accent/30 bg-level-2/95 backdrop-blur-md px-3 sm:px-4 py-2 flex items-center shadow-2xl z-20">
      <Player feed={feed} />
    </div>
  )
}
