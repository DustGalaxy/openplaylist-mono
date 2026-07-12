import apiClient from '@/lib/axios'
import { getConfig } from '@/lib/utils'

export const fetchFeed = async () => {
  const config = getConfig()
  const response = await apiClient(config.API_URL + `/notifications/`, {
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

export const markAllAsRead = async () => {
  const config = getConfig()
  const response = await apiClient(
    config.API_URL + `/notifications/mark-all-as-read`,
    {
      method: 'POST',
      withCredentials: true,
    },
  ).catch((error) => {
    if (error.response.status === 403) {
      return false
    }
  })
  if (!response) return false
  return response.status === 204
}

export const markAsRead = async (notification_id: string) => {
  const config = getConfig()
  const response = await apiClient(
    config.API_URL + `/notifications/${notification_id}/mark-as-read`,
    {
      method: 'POST',
      withCredentials: true,
    },
  ).catch((error) => {
    if (error.response.status === 403) {
      return false
    }
  })
  if (!response) return false
  return response.status === 204
}

export const unReadCount = async () => {
  const config = getConfig()
  const response = await apiClient(
    config.API_URL + `/notifications/unread-count`,
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
