// src/features/player/PlayerBar.tsx
import Player from './Player'
import { usePlaybackFeed } from './hooks/usePlaybackFeed'
import { usePlaybackStore } from '@/stores/playbackStore'
import { useOwnerPlaybackFeed } from '@/features/playlist/hooks/useOwnerPlaybackFeed'
import { useViewerPlaybackFeed } from '@/features/public-playlist/hooks/useViewerPlaybackFeed'
import useMusicStore from '@/stores/musicStore'

export default function PlayerBar() {
  const feed = usePlaybackFeed('player')
  return (
    <div className="h-22 shrink-0 border-t border-level-3/40 bg-level-2 px-3 flex items-center">
      <Player feed={feed} />
    </div>
  )
}
