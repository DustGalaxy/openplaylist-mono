import type {
  UserPasswordUpdatePayload,
  UserProfileUpdatePayload,
} from '@/types/user'
import apiClient from '@/lib/axios'
import { getConfig } from '@/lib/utils'

export const getUserIntegrations = async () => {
  const config = getConfig()
  const response = await apiClient(config.AUTH_API_URL + '/user/integration', {
    method: 'GET',
    withCredentials: true,
  })
  return response.data
}
export const linkIntegration = async (platform: string, code: string) => {
  const config = getConfig()
  const response = await apiClient(
    config.AUTH_API_URL + `/user/integrations/`,
    {
      method: 'POST',
      withCredentials: true,
      data: { code: { code: code }, type: { type: platform } },
    },
  )
  return response.data
}

export const unlinkIntegration = async (platform: string) => {
  const config = getConfig()
  const response = await apiClient(config.AUTH_API_URL + `/user/integration`, {
    method: 'DELETE',
    withCredentials: true,
    data: { type: platform },
  })
  return response.data
}

export const deleteIntegration = async (platform: string, platformUserId: string) => {
  const config = getConfig()
  const response = await apiClient(
    config.AUTH_API_URL + `/user/integration/${platform}/${platformUserId}`,
    {
      method: 'DELETE',
      withCredentials: true,
    },
  )
  return response.status === 204
}

export const connectBot = async (platform: string, platform_user_id: string) => {
  const config = getConfig()
  const response = await apiClient(
    config.AUTH_API_URL + `/user/bots/${platform}/connect`, 
    {
      method: 'POST',
      withCredentials: true,
      data: { platform_user_id: platform_user_id.toString() },
    },
  )
  return response.status === 200
}

export const updateUserProfile = async (payload: UserProfileUpdatePayload) => {
  const config = getConfig()
  const response = await apiClient(config.AUTH_API_URL + '/user/me', {
    method: 'PATCH',
    withCredentials: true,
    data: payload,
  })
  return response.data
}

export const updateUserPassword = async (
  payload: UserPasswordUpdatePayload,
) => {
  const config = getConfig()
  const response = await apiClient(config.AUTH_API_URL + '/user/password', {
    method: 'PATCH',
    withCredentials: true,
    data: payload,
  })
  return response.status === 200 || response.status === 204
}

export const patchSocialLink = async (social_links: object) => {
  const config = getConfig()
  const response = await apiClient(config.AUTH_API_URL + '/user/me', {
    method: 'PATCH',
    withCredentials: true,
    data: { social_links },
  })
  return response.data
}
