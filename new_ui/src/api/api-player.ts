import apiClient from '@/lib/axios'
import { getConfig, removeNullAndUndefined } from '@/lib/utils'
import { getModeratorToken } from '@/lib/moderatorTokenStorage'
import type {
  PlayerBroadcastRequest,
  PlayerPauseRequest,
  PlayerPlayRequest,
  PlayerSeekRequest,
  PlayerState,
  PlayerVolumeRequest,
} from '@/types/player'

const getBaseUrl = () => {
  const config = getConfig()
  return config.API_URL || `${config.BACKEND_DOMAIN}/api`
}

export const fetchPlayerState = async (
  ownerId: string,
): Promise<PlayerState | null> => {
  const response = await apiClient(`${getBaseUrl()}/player/${ownerId}/state`, {
    method: 'GET',
    withCredentials: true,
  }).catch((err) => {
    if (err.response?.status === 404) return null
    throw err
  })

  return response?.data || null
}

export const playPlayerTrack = async (
  ownerId: string,
  data: PlayerPlayRequest,
  token?: string | null,
): Promise<PlayerState> => {
  const modToken =
    token || getModeratorToken(ownerId) || getModeratorToken(data.playlist_id)
  const headers: Record<string, string> = {}
  if (modToken) {
    headers['X-Moderator-Token'] = modToken
  }

  const response = await apiClient(`${getBaseUrl()}/player/${ownerId}/play`, {
    method: 'POST',
    withCredentials: true,
    headers,
    data: removeNullAndUndefined(data),
  })
  return response.data
}

export const pausePlayer = async (
  ownerId: string,
  data: PlayerPauseRequest,
  token?: string | null,
): Promise<PlayerState | null> => {
  const modToken = token || getModeratorToken(ownerId)
  const headers: Record<string, string> = {}
  if (modToken) {
    headers['X-Moderator-Token'] = modToken
  }

  const response = await apiClient(`${getBaseUrl()}/player/${ownerId}/pause`, {
    method: 'POST',
    withCredentials: true,
    headers,
    data: removeNullAndUndefined(data),
  })
  return response.data
}

export const seekPlayer = async (
  ownerId: string,
  data: PlayerSeekRequest,
  token?: string | null,
): Promise<PlayerState | null> => {
  const modToken = token || getModeratorToken(ownerId)
  const headers: Record<string, string> = {}
  if (modToken) {
    headers['X-Moderator-Token'] = modToken
  }

  const response = await apiClient(`${getBaseUrl()}/player/${ownerId}/seek`, {
    method: 'POST',
    withCredentials: true,
    headers,
    data: removeNullAndUndefined(data),
  })
  return response.data
}

export const setPlayerVolume = async (
  ownerId: string,
  data: PlayerVolumeRequest,
  token?: string | null,
): Promise<PlayerState | null> => {
  const modToken = token || getModeratorToken(ownerId)
  const headers: Record<string, string> = {}
  if (modToken) {
    headers['X-Moderator-Token'] = modToken
  }

  const response = await apiClient(`${getBaseUrl()}/player/${ownerId}/volume`, {
    method: 'POST',
    withCredentials: true,
    headers,
    data: removeNullAndUndefined(data),
  })
  return response.data
}

export const setPlayerBroadcastToWidget = async (
  ownerId: string,
  data: PlayerBroadcastRequest,
  token?: string | null,
): Promise<PlayerState | null> => {
  const modToken = token || getModeratorToken(ownerId)
  const headers: Record<string, string> = {}
  if (modToken) {
    headers['X-Moderator-Token'] = modToken
  }

  const response = await apiClient(
    `${getBaseUrl()}/player/${ownerId}/broadcast_widget`,
    {
      method: 'POST',
      withCredentials: true,
      headers,
      data: removeNullAndUndefined(data),
    },
  )
  return response.data
}
