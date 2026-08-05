import apiClient from '@/lib/axios'
import { getConfig } from '@/lib/utils'
import type {
  GlobalStats,
  IncomingStats,
  OutgoingStats,
  StatsPeriod,
  UserPublicStats,
  UserStatsVisibilitySettings,
} from '../types'

const getBaseStatsUrl = () => {
  const config = getConfig()
  return `${config.API_URL}/stats`
}

export const getOutgoingStats = async (
  period: StatsPeriod = '30d',
): Promise<OutgoingStats> => {
  const url = `${getBaseStatsUrl()}/outgoing`
  const response = await apiClient.get<OutgoingStats>(url, {
    params: { period },
    withCredentials: true,
  })
  return response.data
}

export const getIncomingStats = async (
  period: StatsPeriod = '30d',
): Promise<IncomingStats> => {
  const url = `${getBaseStatsUrl()}/incoming`
  const response = await apiClient.get<IncomingStats>(url, {
    params: { period },
    withCredentials: true,
  })
  return response.data
}

export const getGlobalStats = async (
  period: StatsPeriod = '30d',
): Promise<GlobalStats> => {
  const url = `${getBaseStatsUrl()}/global`
  const response = await apiClient.get<GlobalStats>(url, {
    params: { period },
  })
  return response.data
}

export const getUserPublicStats = async (
  targetUserId: string,
  period: StatsPeriod = '30d',
): Promise<UserPublicStats> => {
  const url = `${getBaseStatsUrl()}/users/${targetUserId}/public`
  const response = await apiClient.get<UserPublicStats>(url, {
    params: { period },
  })
  return response.data
}

export const updateStatsPrivacy = async (
  patch: Partial<UserStatsVisibilitySettings>,
): Promise<UserStatsVisibilitySettings> => {
  const url = `${getBaseStatsUrl()}/me/privacy`
  const response = await apiClient.patch<UserStatsVisibilitySettings>(
    url,
    patch,
    {
      withCredentials: true,
    },
  )
  return response.data
}
