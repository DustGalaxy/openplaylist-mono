import type {
  UserPasswordUpdatePayload,
  UserProfileUpdatePayload,
} from '@/types/user'
import type {
  SubscriptionPatchPayload,
  SubscriptionSettings,
} from '@/features/notifications/types'
import apiClient from '@/lib/axios'
import { getConfig } from '@/lib/utils'

export const fetchUserPublic = async (userId: string) => {
  const config = getConfig()
  const response = await apiClient(config.AUTH_API_URL + `/user/${userId}`, {
    method: 'GET',
  }).catch(() => {
    return null
  })
  return response ? response.data : response
}

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
    config.AUTH_API_URL + `/user/integrations/${platform}`,
    {
      method: 'POST',
      withCredentials: true,
      data: { code: { code: code } },
    },
  )
  return response.data
}

export const linkIntegrationUserKey = async (
  platform: string,
  userKey: string,
) => {
  const config = getConfig()
  const response = await apiClient(
    config.AUTH_API_URL + `/user/integration/${platform}/token`,
    {
      method: 'POST',
      withCredentials: true,
      data: { user_key: userKey },
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

export const deleteIntegration = async (
  platform: string,
  platformUserId: string,
) => {
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

export const connectBot = async (
  platform: string,
  platform_user_id: string,
) => {
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
export const disconnectBot = async (
  platform: string,
  platform_user_id: string,
) => {
  const config = getConfig()
  const response = await apiClient(
    config.AUTH_API_URL + `/user/bots/${platform}/disconnect`,
    {
      method: 'POST',
      withCredentials: true,
      data: { platform_user_id: platform_user_id.toString() },
    },
  )
  return response.status === 200
}

export async function updateBotSettings(
  platform: string,
  platformUserId: string,
  settings: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const config = getConfig()
  const res = await apiClient(
    config.AUTH_API_URL + `/user/bots/${platform}/settings`,
    {
      method: 'PATCH',
      withCredentials: true,
      data: { platform_user_id: platformUserId.toString(), settings },
    },
  )
  return res.data
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

export const deleteUser = async () => {
  const config = getConfig()
  const response = await apiClient(config.AUTH_API_URL + '/user/me', {
    method: 'DELETE',
    withCredentials: true,
  })
  return response.status === 204
}

export const getWidgetToken = async () => {
  const config = getConfig()
  const response = await apiClient(config.AUTH_API_URL + '/stream/gen-token', {
    method: 'GET',
    withCredentials: true,
  })
  return response.data
}

export const createSubscription = async (
  target_id: string,
  target_type: string,
  target_name: string,
  settings?: SubscriptionSettings,
) => {
  const config = getConfig()
  const response = await apiClient(
    config.API_URL + '/notifications/subscriptions',
    {
      method: 'POST',
      withCredentials: true,
      data: { target_id, target_type, target_name, settings },
    },
  )
  return response.data
}

export const deleteSubscription = async (subscription_id: string) => {
  const config = getConfig()
  const response = await apiClient(
    config.API_URL + `/notifications/subscriptions/${subscription_id}`,
    {
      method: 'DELETE',
      withCredentials: true,
    },
  )
  return response.status === 204
}

export const patchSubscriptionSettings = async (
  subscription_id: string,
  settings: SubscriptionPatchPayload,
) => {
  const config = getConfig()
  const response = await apiClient(
    config.API_URL + `/notifications/subscriptions/${subscription_id}`,
    {
      method: 'PATCH',
      withCredentials: true,
      data: settings,
    },
  )
  return response.data
}

export const getSubscriptions = async () => {
  const config = getConfig()
  const response = await apiClient(
    config.API_URL + '/notifications/subscriptions',
    {
      method: 'GET',
      withCredentials: true,
    },
  )
  return response.data
}
