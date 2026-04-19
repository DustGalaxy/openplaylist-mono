import type { ChatPlatform, ReadChatRules } from '@/types/playlist'
import apiClient from '@/lib/axios'
import { getConfig, removeNullAndUndefined } from '@/lib/utils'

export const orderedChatRoles = async (
  data: Array<string>,
  playlist_id: string,
) => {
  const config = getConfig()
  const response = await apiClient(
    config.AUTH_API_URL + `/settings/${playlist_id}/chat/order`,
    {
      method: 'patch',
      data: data,
      withCredentials: true,
    },
  ).catch((error) => {
    console.error('Error creating chat role:', error.response?.data || error)
    return null
  })
  return response?.status === 200
}

export const createChatRole = async ({
  playlist_id,
  data,
}: {
  playlist_id: string
  data: {
    platform: ChatPlatform
    settings_id: string
    key: string
    priority: number
  }
}) => {
  const config = getConfig()
  const response = await apiClient(
    config.AUTH_API_URL + `/settings/${playlist_id}/chat`,
    {
      method: 'POST',
      data: data,
      withCredentials: true,
    },
  ).catch((error) => {
    console.error('Error creating chat role:', error.response?.data || error)
    return null
  })
  return response?.data as ReadChatRules | null
}

export const updateChatRole = async ({
  playlist_id,
  data,
}: {
  playlist_id: string
  data: ReadChatRules
}) => {
  const config = getConfig()
  const response = await apiClient(
    config.AUTH_API_URL + `/settings/${playlist_id}/chat/${data.id}`,
    {
      method: 'PATCH',
      data: removeNullAndUndefined(data),
      withCredentials: true,
    },
  ).catch((error) => {
    console.error('Error updating chat role:', error.response?.data || error)
    return null
  })
  return response?.data as ReadChatRules | null
}

export const deleteChatRole = async ({
  playlist_id,
  role_id,
}: {
  playlist_id: string
  role_id: string
}) => {
  const config = getConfig()
  const response = await apiClient(
    config.AUTH_API_URL + `/settings/${playlist_id}/chat/${role_id}`,
    {
      method: 'DELETE',
      withCredentials: true,
    },
  ).catch((error) => {
    console.error('Error deleting chat role:', error.response?.data || error)
    return null
  })
  return response?.status === 204
}
