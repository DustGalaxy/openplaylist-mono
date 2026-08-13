import apiClient from '@/lib/axios'
import { getConfig } from '@/lib/utils'

export interface PlaybackHistoryItem {
  id: string
  order_id: string
  playlist_id: string
  playlist_name: string
  title: string
  yt_video_id: string
  duration: number
  views: number
  likes: number
  requester_nickname: string
  source: string
  played_at: string
}

export interface PlaybackHistoryListResponse {
  items: PlaybackHistoryItem[]
  total: number
  limit: number
  offset: number
}

export const fetchPlaybackHistory = async (params?: {
  limit?: number
  offset?: number
  search?: string
}): Promise<PlaybackHistoryListResponse> => {
  const config = getConfig()
  const response = await apiClient.get(config.AUTH_API_URL + '/history', {
    params,
    withCredentials: true,
  })
  return response.data
}

export const deleteHistoryItem = async (historyId: string): Promise<void> => {
  const config = getConfig()
  await apiClient.delete(config.AUTH_API_URL + `/history/${historyId}`, {
    withCredentials: true,
  })
}

export const clearPlaybackHistory = async (): Promise<{ count: number }> => {
  const config = getConfig()
  const response = await apiClient.delete(config.AUTH_API_URL + '/history/clear', {
    withCredentials: true,
  })
  return response.data
}
