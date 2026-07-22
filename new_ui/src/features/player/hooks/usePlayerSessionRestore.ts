// src/features/player/hooks/usePlayerSessionRestore.ts
import { useEffect, useRef } from 'react'
import { usePlaylistStore } from '@/stores/playlistStore'
import { loadPlayerSession } from '@/lib/playerSessionPersistence'

export function usePlayerSessionRestore() {
  const ranRef = useRef(false)

  useEffect(() => {
    if (ranRef.current) return
    ranRef.current = true

    const session = loadPlayerSession()
    if (!session) {
      usePlaylistStore.getState().setPlayerSessionRestored()
      return
    }

    ;(async () => {
      await usePlaylistStore
        .getState()
        .setSlotPlaylist('player', session.playlistId)
      const entry = usePlaylistStore.getState().cache[session.playlistId]
      const trackStillExists = entry?.data?.track_data.some(
        (t) => t.id === session.trackId,
      )
      if (trackStillExists) {
        usePlaylistStore.getState().setPlayerTrack(session.trackId)
      }
      usePlaylistStore.getState().setPlayerSessionRestored()
    })()
  }, [])
}
