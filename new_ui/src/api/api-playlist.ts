import { v4 as uuidv4 } from 'uuid'
import type {
  ClientPlaylist,
  InputPlaylist,
  Order,
  PlaylistPatch,
  PlaylistSettings,
} from '@/types/playlist'
import apiClient from '@/lib/axios'
import { useAuthStore } from '@/stores/authStore'
import { getConfig, removeNullAndUndefined } from '@/lib/utils'
import type { PlaylistLog } from '@/types/playlistLog'

export const fetchPlaylistPublic = async (
  playlist_id: string,
): Promise<InputPlaylist | null> => {
  const config = getConfig()
  const response = await apiClient(
    config.PLST_API_URL + `/${playlist_id}/public`,
    {
      method: 'GET',
    },
  ).catch((error) => {
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
  return response.data as ClientPlaylist
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
  })
  return response.data
}

export const removeTrackFromPlaylist = async (
  playlist_id: string,
  track_id: string,
  reason?: string,
) => {
  const { user } = useAuthStore.getState()
  if (!user) return
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

export const changePlaylistSettings = async (
  playlist_id: string,
  settings: Partial<PlaylistSettings>,
): Promise<PlaylistSettings> => {
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
) => {
  const { user } = useAuthStore.getState()
  if (!user) return
  const config = getConfig()
  const response = await apiClient(
    config.PLST_API_URL + `/${playlist_id}/playnow`,
    {
      method: 'PATCH',
      withCredentials: true,
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
  showInWidget: boolean,
  description?: string,
) => {
  const config = getConfig()
  const response = await apiClient(config.PLST_API_URL + ``, {
    method: 'POST',
    withCredentials: true,
    data: {
      name: name,
      show_in_widget: showInWidget,
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
  settings_id: string,
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
        settings_id,
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
): Promise<PlaylistLog[]> {
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
) => {
  const config = getConfig()
  return apiClient(
    config.AUTH_API_URL + `/playback/${playlist_id}/state/pause`,
    {
      method: 'POST',
      withCredentials: true,
      data: { is_paused, position, track_id },
    },
  )
}

export const postSeekState = async (
  playlist_id: string,
  position: number,
  track_id: string,
) => {
  const config = getConfig()
  return apiClient(
    config.AUTH_API_URL + `/playback/${playlist_id}/state/seek`,
    {
      method: 'POST',
      withCredentials: true,
      data: { position, track_id },
    },
  )
}

export const postPositionState = async (
  playlist_id: string,
  position: number,
) => {
  const config = getConfig()
  return apiClient(
    config.AUTH_API_URL + `/playback/${playlist_id}/state/position`,
    {
      method: 'POST',
      withCredentials: true,
      data: position,
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
