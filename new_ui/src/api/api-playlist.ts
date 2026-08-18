import type {
  FavoriteStatusResponse,
  InputPlaylist,
  Order,
  Playlist,
  PlaylistPatch,
  ReadPlaylistPreview,
} from '@/types/playlist'
import type { PlaylistLog } from '@/types/playlistLog'
import apiClient from '@/lib/axios'
import { useAuthStore } from '@/stores/authStore'
import { getConfig, removeNullAndUndefined } from '@/lib/utils'
import { getModeratorToken } from '@/lib/moderatorTokenStorage'

export const fetchPlaylistPublic = async (
  playlist_id: string,
): Promise<InputPlaylist | null> => {
  if (
    !playlist_id ||
    playlist_id === 'undefined' ||
    playlist_id === 'null' ||
    !playlist_id.trim()
  ) {
    return null
  }
  const config = getConfig()
  const response = await apiClient(
    config.PLST_API_URL + `/${playlist_id}/public`,
    {
      method: 'GET',
      withCredentials: true,
    },
  ).catch((error) => {
    if (error.response.status === 403) {
      return null
    }
  })
  if (!response) return null
  return response.data
}

export const fetchPlaylist = async (
  playlist_id: string,
): Promise<InputPlaylist | null> => {
  if (
    !playlist_id ||
    playlist_id === 'undefined' ||
    playlist_id === 'null' ||
    !playlist_id.trim()
  ) {
    return null
  }
  const config = getConfig()
  const response = await apiClient(config.PLST_API_URL + `/${playlist_id}`, {
    method: 'GET',
    withCredentials: true,
  }).catch((error) => {
    if (error.response.status === 403) {
      return null
    }
  })
  if (!response) return null
  return response.data
}

export const fetchUserPlaylistData = async () => {
  const config = getConfig()
  const response = await apiClient(config.PLST_API_URL + '/me', {
    method: 'GET',
    withCredentials: true,
  })
    .then((res) => res.data)
    .catch((error) => {})
  return response
}

export const fetchUserPlaylistPreviews = async () => {
  const config = getConfig()
  const response = await apiClient(config.PLST_API_URL + '/me', {
    method: 'GET',
    withCredentials: true,
    params: { preview: true },
  })
    .then((res) => res.data)
    .catch((error) => {})
  return response
}

export const fetchMyPlaylists = fetchUserPlaylistPreviews

export const changePlaylistActive = async (
  playlist_id: string,
  is_active: boolean,
) => {
  const config = getConfig()
  const response = await apiClient(config.PLST_API_URL + `/${playlist_id}`, {
    method: 'PATCH',
    withCredentials: true,
    data: {
      is_allow_external_requests: !is_active,
    },
  })
    .then((res) => res.data)
    .catch((error) => {})
  return response
}

export const patchPlaylist = async (
  playlist_id: string,
  data: PlaylistPatch,
) => {
  const config = getConfig()
  const response = await apiClient(config.PLST_API_URL + `/${playlist_id}`, {
    method: 'PATCH',
    withCredentials: true,
    data: removeNullAndUndefined(data),
  })
  return response.data as Playlist
}

export const updatePlaylistDetails = async (
  playlist_id: string,
  name: string,
  description?: string,
) => {
  return patchPlaylist(playlist_id, {
    name,
    description: description ?? '',
  })
}

export const changePlaylistPriority = async (
  id: string,
  prioriry_mode: boolean,
) => {
  const config = getConfig()
  const response = await apiClient(config.AUTH_API_URL + `/settings/${id}`, {
    method: 'PATCH',
    withCredentials: true,
    data: {
      prioriry_mode: prioriry_mode,
    },
  })

  return response.data
}

export const addTrackToPlaylist = async (order: Order) => {
  const config = getConfig()
  const response = await apiClient(config.ORDER_API_URL + `/new`, {
    method: 'POST',
    withCredentials: true,
    data: order,
    params: order.start_from_target ? { start_from_target: true } : undefined,
  })
  return response.data
}

export const removeTrackFromPlaylist = async (
  playlist_id: string,
  track_id: string,
  reason?: string,
) => {
  const config = getConfig()
  const response = await apiClient(
    config.PLST_API_URL +
      `/${playlist_id}/track/${track_id}` +
      `?reason=${reason}`,
    {
      method: 'DELETE',
      withCredentials: true,
    },
  )
  return response
}

export const bulkRemoveTracksFromPlaylist = async (
  playlist_id: string,
  track_ids: Array<string>,
  reason?: string,
) => {
  const config = getConfig()
  const responce = await apiClient(
    config.PLST_API_URL + `/${playlist_id}/track/bulk-delete`,
    {
      method: 'POST',
      withCredentials: true,
      data: { track_ids, reason },
    },
  )
  return responce.data
}

export const changePlaylistSettings = async (
  playlist_id: string,
  settings: Partial<Playlist>,
): Promise<Playlist> => {
  const config = getConfig()
  const response = await apiClient(
    config.AUTH_API_URL + `/settings/${playlist_id}`,
    {
      method: 'PATCH',
      withCredentials: true,
      data: removeNullAndUndefined(settings),
    },
  )
  return response.data
}

export const postPlayNow = async (
  playlist_id: string,
  track_id: string | undefined,
  token?: string | null,
) => {
  const config = getConfig()
  const modToken = token || getModeratorToken(playlist_id)
  const headers: Record<string, string> = {}
  if (modToken) {
    headers['X-Moderator-Token'] = modToken
  }
  const response = await apiClient(
    config.PLST_API_URL + `/${playlist_id}/playnow`,
    {
      method: 'PATCH',
      withCredentials: true,
      headers,
      data: {
        playlist_id: playlist_id,
        track_id: track_id ? track_id : null,
      },
    },
  )
  return response
}

export const createNewPlaylist = async (
  name: string,
  description?: string,
) => {
  const config = getConfig()
  const response = await apiClient(config.PLST_API_URL + ``, {
    method: 'POST',
    withCredentials: true,
    data: {
      name: name,
      description: description,
    },
  })
  return response.data
}

export const deletePlaylist = async (playlist_id: string) => {
  const config = getConfig()
  const response = await apiClient(config.PLST_API_URL + `/${playlist_id}`, {
    method: 'DELETE',
    withCredentials: true,
  })
  return response.status == 204
}

export const getPublicPlaylists = async (query: string) => {
  const config = getConfig()
  const response = await apiClient(config.PLST_API_URL + `?query=${query}`, {
    method: 'GET',
    withCredentials: true,
  }).catch((error) => {
    if (error.response.status === 403) {
      return null
    }
  })
  if (!response) return null
  return response.data
}

export const blockUser = async (
  playlist_id: string,
  trigger_type: string,
  trigger_value: string,
  platform: string,
) => {
  const config = getConfig()
  const response = await apiClient(
    config.AUTH_API_URL + `/settings/${playlist_id}/blocklist`,
    {
      method: 'POST',
      withCredentials: true,
      data: {
        trigger_type: trigger_type,
        trigger_value: trigger_value,
        playlist_id,
        platform,
      },
    },
  )
  return response.data
}

export const unBlockUser = async (playlist_id: string, id: string) => {
  const config = getConfig()
  const response = await apiClient(
    config.AUTH_API_URL + `/settings/${playlist_id}/blocklist/${id}`,
    {
      method: 'DELETE',
      withCredentials: true,
    },
  )
  return response.status === 204
}

/** Payload for playlist track/user reports (server endpoint TBD). */
export type PlaylistReportPayload = {
  playlist_id: string
  settings_id: string
  yt_video_id: string
  track_id?: string
  requester_nickname: string
  requester_id?: string
  platform: string
  reason: string
  block_user: boolean
  block_track: boolean
}

/**
 * Submits a moderation report. Endpoint is prepared for backend wiring;
 * failures are non-fatal for local block/remove actions.
 */
export const submitPlaylistReport = async (
  payload: PlaylistReportPayload,
): Promise<boolean> => {
  const config = getConfig()
  try {
    await apiClient(
      config.AUTH_API_URL + `/settings/${payload.playlist_id}/reports`,
      {
        method: 'POST',
        withCredentials: true,
        data: removeNullAndUndefined(payload),
      },
    )
    return true
  } catch {
    return false
  }
}

export async function fetchPlaylistLogs(
  playlistId: string,
): Promise<Array<PlaylistLog>> {
  const config = getConfig()
  const response = await apiClient(
    config.PLST_API_URL + `/${playlistId}/logs`,
    {
      method: 'GET',
      withCredentials: true,
    },
  )
  if (!response.status || response.status !== 200)
    throw new Error('Failed to fetch logs')
  return response.data
}

export const postPauseState = async (
  playlist_id: string,
  is_paused: boolean,
  position: number,
  track_id: string,
  client_id?: string,
) => {
  const config = getConfig()
  return apiClient(
    config.AUTH_API_URL + `/playback/${playlist_id}/state/pause`,
    {
      method: 'POST',
      withCredentials: true,
      data: { is_paused, position, track_id, client_id },
    },
  )
}

export const postSeekState = async (
  playlist_id: string,
  position: number,
  track_id: string,
  client_id?: string,
) => {
  const config = getConfig()
  return apiClient(
    config.AUTH_API_URL + `/playback/${playlist_id}/state/seek`,
    {
      method: 'POST',
      withCredentials: true,
      data: { position, track_id, client_id },
    },
  )
}

export const postPositionState = async (
  playlist_id: string,
  position: number,
  client_id: string,
) => {
  const config = getConfig()
  return apiClient(
    config.AUTH_API_URL + `/playback/${playlist_id}/state/position`,
    {
      method: 'POST',
      withCredentials: true,
      data: { position: position, client_id: client_id },
    },
  )
}

export const getPlaybackState = async (
  playlist_id: string,
): Promise<Record<string, string> | null> => {
  const config = getConfig()
  const response = await apiClient(
    config.AUTH_API_URL + `/playback/${playlist_id}/state`,
    {
      method: 'GET',
    },
  ).catch(() => null)
  return response ? response.data : null
}

// ─── Favorite Playlist Operations ───────────────────────────────────

export const fetchUserFavoritePlaylists = async (): Promise<
  Array<ReadPlaylistPreview>
> => {
  const config = getConfig()
  const response = await apiClient(config.PLST_API_URL + '/favorites/me', {
    method: 'GET',
    withCredentials: true,
  })
    .then((res) => res.data)
    .catch(() => [])
  return response || []
}

export const checkPlaylistFavoriteStatus = async (
  playlist_id: string,
): Promise<FavoriteStatusResponse | null> => {
  if (
    !playlist_id ||
    playlist_id === 'undefined' ||
    playlist_id === 'null' ||
    !playlist_id.trim()
  ) {
    return null
  }
  const config = getConfig()
  const response = await apiClient(
    config.PLST_API_URL + `/${playlist_id}/is-favorite`,
    {
      method: 'GET',
      withCredentials: true,
    },
  )
    .then((res) => res.data)
    .catch(() => null)
  return response
}

export const addPlaylistToFavorites = async (
  playlist_id: string,
): Promise<FavoriteStatusResponse | null> => {
  const config = getConfig()
  const response = await apiClient(
    config.PLST_API_URL + `/${playlist_id}/favorite`,
    {
      method: 'POST',
      withCredentials: true,
    },
  )
    .then((res) => res.data)
    .catch(() => null)
  return response
}

export const removePlaylistFromFavorites = async (
  playlist_id: string,
): Promise<FavoriteStatusResponse | null> => {
  const config = getConfig()
  const response = await apiClient(
    config.PLST_API_URL + `/${playlist_id}/favorite`,
    {
      method: 'DELETE',
      withCredentials: true,
    },
  )
    .then((res) => res.data)
    .catch(() => null)
  return response
}
