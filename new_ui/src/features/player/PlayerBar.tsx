// src/features/player/PlayerBar.tsx
import Player from './Player'
import { usePlaybackFeed } from './hooks/usePlaybackFeed'

export default function PlayerBar() {
  const feed = usePlaybackFeed('player')
  return (
    <div className="h-22 shrink-0 border-t border-level-3/40 bg-level-2 px-3 flex items-center">
      <Player feed={feed} />
    </div>
  )
}
