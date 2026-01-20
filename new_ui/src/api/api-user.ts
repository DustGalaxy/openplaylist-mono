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

export const connectBot = async (platform: string) => {
  const config = getConfig()
  const response = await apiClient(
    config.AUTH_API_URL + `/user/bots/${platform}/connect`,
    {
      method: 'POST',
      withCredentials: true,
    },
  )
  return response.data
}
