import type { ContentSettings, Platform } from '@/types/playlist'
import apiClient from '@/lib/axios'
import { useAuthStore } from '@/stores/authStore'
import { getConfig, removeNullAndUndefined } from '@/lib/utils'

export const initPlatformContent = async ({
  playlist_id,
  platform,
}: {
  playlist_id: string
  platform: Platform
}) => {
  const config = getConfig()
  const response = await apiClient(
    config.AUTH_API_URL + `/settings/${playlist_id}/content`,
    {
      method: 'POST',
      data: {
        playlist_id,
        platform,
      },
      withCredentials: true,
    },
  ).catch((error) => {
    if (error.response.status === 403) {
      return null
    }
  })
  return response?.data as ContentSettings | null
}

export const updateContent = async ({
  playlist_id,
  data,
}: {
  playlist_id: string
  data: ContentSettings
}) => {
  const config = getConfig()
  const response = await apiClient(
    config.AUTH_API_URL + `/settings/${playlist_id}/content/${data.id}`,
    {
      method: 'PATCH',
      data: data,
      withCredentials: true,
    },
  ).catch((error) => {
    if (error.response.status === 403) {
      return null
    }
  })
  return response?.data as ContentSettings | null
}
