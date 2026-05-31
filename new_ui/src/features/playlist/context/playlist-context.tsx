import React from 'react'
import type { ClientPlaylist } from '@/types/playlist'

const PlaylistContext = React.createContext<ClientPlaylist | null>(null)

export function PlaylistProvider({
  playlist,
  children,
}: {
  playlist: ClientPlaylist
  children: React.ReactNode
}) {
  return (
    <PlaylistContext.Provider value={playlist}>{children}</PlaylistContext.Provider>
  )
}

export function usePlaylist(): ClientPlaylist {
  const playlist = React.useContext(PlaylistContext)
  if (playlist == null) {
    throw new Error('usePlaylist must be used within a PlaylistProvider')
  }
  return playlist
}
