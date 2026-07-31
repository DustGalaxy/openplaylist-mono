// src/features/player/PlayerBar.tsx
import Player from './Player'
import { usePlaybackFeed } from './hooks/usePlaybackFeed'

export default function PlayerBar() {
  const feed = usePlaybackFeed('player')
  return (
    <div className="min-h-20 md:h-22 shrink-0 border-t border-level-3/40 bg-level-2 px-2.5 sm:px-3 py-2 md:py-0 flex items-center">
      <Player feed={feed} />
    </div>
  )
}
