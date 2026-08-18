import { useEffect, useState, useCallback } from 'react'
import { fetchModeratorAccess } from '@/api/api-moderators'
import {
  getModeratorToken,
  removeModeratorToken,
} from '@/lib/moderatorTokenStorage'
import type { ModeratorAccessInfo } from '@/types/moderator'

export interface PlaylistAccessState {
  accessInfo: ModeratorAccessInfo | null
  loading: boolean
  isOwner: boolean
  isModerator: boolean
  canManageQueue: boolean
  canManagePlayback: boolean
  canManageSettings: boolean
  refetch: () => Promise<void>
}

export function usePlaylistAccess(playlistId?: string): PlaylistAccessState {
  const [accessInfo, setAccessInfo] = useState<ModeratorAccessInfo | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  const loadAccess = useCallback(async () => {
    if (
      !playlistId ||
      playlistId === 'undefined' ||
      playlistId === 'null' ||
      !playlistId.trim()
    ) {
      setAccessInfo(null)
      setLoading(false)
      return
    }

    setLoading(true)
    const token = getModeratorToken(playlistId)

    try {
      const info = await fetchModeratorAccess(playlistId, token)
      if (info) {
        setAccessInfo(info)
      } else {
        if (token) {
          removeModeratorToken(playlistId)
        }
        setAccessInfo(null)
      }
    } catch {
      setAccessInfo(null)
    } finally {
      setLoading(false)
    }
  }, [playlistId])

  useEffect(() => {
    loadAccess()
  }, [loadAccess])

  const isOwner = accessInfo?.access_level === 'owner'
  const isModerator =
    Boolean(accessInfo) &&
    accessInfo?.access_level !== 'owner' &&
    accessInfo?.access_level !== 'none'

  const canManageQueue =
    isOwner ||
    Boolean(accessInfo?.can_manage_tracks) ||
    Boolean((accessInfo as any)?.permissions?.can_manage_queue)
  const canManagePlayback =
    isOwner ||
    Boolean(accessInfo?.can_manage_tracks) ||
    Boolean((accessInfo as any)?.permissions?.can_manage_playback)
  const canManageSettings =
    isOwner ||
    Boolean(accessInfo?.can_manage_settings) ||
    Boolean((accessInfo as any)?.permissions?.can_manage_settings)

  return {
    accessInfo,
    loading,
    isOwner,
    isModerator,
    canManageQueue,
    canManagePlayback,
    canManageSettings,
    refetch: loadAccess,
  }
}
