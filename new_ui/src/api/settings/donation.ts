import type { DonationPlatform, ReadDonationRules } from '@/types/playlist'
import apiClient from '@/lib/axios'
import { useAuthStore } from '@/stores/authStore'
import { getConfig, removeNullAndUndefined } from '@/lib/utils'

export const initPlatformDonation = async ({
  playlist_id,
  data,
}: {
  playlist_id: string
  data: {
    name: string
    slug: string
    platform: DonationPlatform
    settings_id: string
  }
}) => {
  const config = getConfig()
  const response = await apiClient(
    config.AUTH_API_URL + `/settings/${playlist_id}/donation`,
    {
      method: 'POST',
      data: data,
      withCredentials: true,
    },
  ).catch((error) => {
    if (error.response.status != 201) {
      console.error(
        'Error initializing platform donation:',
        error.response.data,
      )

      return null
    }
  })
  return response?.data as ReadDonationRules | null
}

export const updateDonation = async ({
  playlist_id,
  data,
}: {
  playlist_id: string
  data: ReadDonationRules
}) => {
  const config = getConfig()
  const response = await apiClient(
    config.AUTH_API_URL + `/settings/${playlist_id}/donation/${data.id}`,
    {
      method: 'PATCH',
      data: removeNullAndUndefined(data),
      withCredentials: true,
    },
  ).catch((error) => {
    if (error.response.status !== 200) {
      console.error('Error updating donation:', error.response.data)
      return null
    }
  })
  return response?.data as ReadDonationRules | null
}

export const createDonationRule = async ({
  playlist_id,
  data,
}: {
  playlist_id: string
  data: {
    platform: DonationPlatform
    settings_id: string
  }
}) => {
  const config = getConfig()
  const response = await apiClient(
    config.AUTH_API_URL + `/settings/${playlist_id}/donation`,
    {
      method: 'POST',
      data: data,
      withCredentials: true,
    },
  ).catch((error) => {
    console.error(
      'Error creating donation rule:',
      error.response?.data || error,
    )
    return null
  })
  return response?.data as ReadDonationRules | null
}
