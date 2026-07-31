import type { FeaturesResponse } from '@/features/feature-gate/types'
import apiClient from '@/lib/axios'
import { getConfig } from '@/lib/utils'

export async function fetchMyFeatures(): Promise<FeaturesResponse> {
  const config = getConfig()
  const { data } = await apiClient.get<FeaturesResponse>(
    config.AUTH_API_URL + '/user/me/features',
    {
      withCredentials: true,
    },
  )
  return data
}
