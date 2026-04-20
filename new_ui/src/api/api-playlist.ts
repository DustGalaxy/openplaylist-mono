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

export const createNewPlaylist = async (name: string, description?: string) => {
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
