// src/features/playlist/context/playlist-view-context.tsx
import React from 'react'
import type {
  Playlist,
  PlaylistRole,
  SlotId,
} from '@/stores/playlistStore/types'
import { usePlaylistStore } from '@/stores/playlistStore'
import type { PublicUser } from '@/types/user'

interface PlaylistViewContextValue {
  slot: SlotId
  playlistId: string | null
  playlist: Playlist | undefined
  role: PlaylistRole
  owner: PublicUser | undefined
  isLoading: boolean // attached but data not yet arrived (fetch in flight)
}

const PlaylistViewContext =
  React.createContext<PlaylistViewContextValue | null>(null)

export function PlaylistViewProvider({
  slot,
  children,
}: {
  slot: SlotId
  children: React.ReactNode
}) {
  const playlistId = usePlaylistStore((s) => s.slots[slot].playlistId)
  const playlist = usePlaylistStore((s) =>
    playlistId ? s.cache[playlistId]?.data : undefined,
  )
  const owner = usePlaylistStore((s) =>
    playlistId ? s.cache[playlistId]?.owner : undefined,
  )
  const role = usePlaylistStore((s) => s.getSlotRole(slot))
  const attached = usePlaylistStore((s) =>
    playlistId ? !!s.cache[playlistId] : false,
  )

  const value: PlaylistViewContextValue = {
    slot,
    playlistId,
    playlist,
    role,
    owner,
    isLoading: attached && !playlist,
  }

  return (
    <PlaylistViewContext.Provider value={value}>
      {children}
    </PlaylistViewContext.Provider>
  )
}

export function usePlaylistView(): PlaylistViewContextValue {
  const ctx = React.useContext(PlaylistViewContext)
  if (ctx == null) {
    throw new Error(
      'usePlaylistView must be used within a PlaylistViewProvider',
    )
  }
  return ctx
}

/** Convenience: throws if playlist isn't loaded yet — use in leaf components rendered only after loading gate. */
export function usePlaylistViewLoaded(): PlaylistViewContextValue & {
  playlist: Playlist
} {
  const ctx = usePlaylistView()
  if (!ctx.playlist) {
    throw new Error('usePlaylistViewLoaded called before playlist data loaded')
  }
  return ctx as PlaylistViewContextValue & { playlist: Playlist }
}
