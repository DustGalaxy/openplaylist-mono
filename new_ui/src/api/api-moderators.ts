import apiClient from '@/lib/axios'
import { getConfig, removeNullAndUndefined } from '@/lib/utils'
import type {
  CreateModeratorTokenRequest,
  DirectAddModeratorRequest,
  ModeratorAccessInfo,
  ModeratorItemResponse,
  UpdateModeratorRequest,
  UserModeratedPlaylistResponse,
} from '@/types/moderator'

export const createModeratorToken = async (
  playlistId: string,
  data: CreateModeratorTokenRequest,
): Promise<ModeratorItemResponse> => {
  const config = getConfig()
  const response = await apiClient(
    config.PLST_API_URL + `/${playlistId}/moderators/token`,
    {
      method: 'POST',
      withCredentials: true,
      data: removeNullAndUndefined(data),
    },
  )
  return response.data
}

export const addModeratorByUserId = async (
  playlistId: string,
  data: DirectAddModeratorRequest,
): Promise<ModeratorItemResponse> => {
  const config = getConfig()
  const response = await apiClient(
    config.PLST_API_URL + `/${playlistId}/moderators/user`,
    {
      method: 'POST',
      withCredentials: true,
      data: removeNullAndUndefined(data),
    },
  )
  return response.data
}

export const claimModeratorToken = async (
  playlistId: string,
  token: string,
): Promise<ModeratorItemResponse> => {
  const config = getConfig()
  const response = await apiClient(
    config.PLST_API_URL + `/${playlistId}/moderators/claim`,
    {
      method: 'POST',
      withCredentials: true,
      params: { token },
    },
  )
  return response.data
}

export const updateModerator = async (
  playlistId: string,
  moderatorId: string,
  data: UpdateModeratorRequest,
): Promise<ModeratorItemResponse> => {
  const config = getConfig()
  const response = await apiClient(
    config.PLST_API_URL + `/${playlistId}/moderators/${moderatorId}`,
    {
      method: 'PATCH',
      withCredentials: true,
      data: removeNullAndUndefined(data),
    },
  )
  return response.data
}

export const leaveModerator = async (playlistId: string): Promise<void> => {
  const config = getConfig()
  await apiClient(config.PLST_API_URL + `/${playlistId}/moderators/leave`, {
    method: 'DELETE',
    withCredentials: true,
  })
}

export const fetchModerators = async (
  playlistId: string,
): Promise<ModeratorItemResponse[]> => {
  const config = getConfig()
  const response = await apiClient(
    config.PLST_API_URL + `/${playlistId}/moderators`,
    {
      method: 'GET',
      withCredentials: true,
    },
  )
  return response.data
}

export const revokeModerator = async (
  playlistId: string,
  moderatorId: string,
): Promise<void> => {
  const config = getConfig()
  await apiClient(
    config.PLST_API_URL + `/${playlistId}/moderators/${moderatorId}`,
    {
      method: 'DELETE',
      withCredentials: true,
    },
  )
}

export const fetchModeratorAccess = async (
  playlistId: string,
  token?: string | null,
): Promise<ModeratorAccessInfo | null> => {
  const config = getConfig()
  const params: Record<string, string> = {}
  if (token) {
    params.token = token
  }

  const response = await apiClient(
    config.PLST_API_URL + `/${playlistId}/moderators/access`,
    {
      method: 'GET',
      withCredentials: true,
      params,
    },
  ).catch((error) => {
    if (error.response?.status === 403 || error.response?.status === 404) {
      return null
    }
    throw error
  })

  if (!response) return null
  return response.data
}

export const fetchUserModeratedPlaylists = async (): Promise<
  UserModeratedPlaylistResponse[]
> => {
  const config = getConfig()
  const response = await apiClient(
    config.AUTH_API_URL + `/user/me/moderating`,
    {
      method: 'GET',
      withCredentials: true,
    },
  ).catch(() => null)

  if (response?.data && Array.isArray(response.data)) {
    return response.data
  }
  return []
}
