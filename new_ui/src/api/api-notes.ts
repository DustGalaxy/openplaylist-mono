import apiClient from '@/lib/axios'
import { getConfig } from '@/lib/utils'

export interface OrderNoteData {
  order_id: string
  playlist_id: string
  note: string | null
  is_public: boolean
}

export interface OrderNoteUpsertPayload {
  note: string
  is_public: boolean
}

export const fetchOrderNote = async (
  playlistId: string,
  orderId: string,
): Promise<OrderNoteData | null> => {
  const config = getConfig()
  try {
    const response = await apiClient<OrderNoteData>(
      `${config.PLST_API_URL}/${playlistId}/order/${orderId}/note`,
      {
        method: 'GET',
        withCredentials: true,
      },
    )
    return response.data
  } catch (error) {
    return null
  }
}

export const upsertOrderNote = async (
  playlistId: string,
  orderId: string,
  payload: OrderNoteUpsertPayload,
): Promise<OrderNoteData> => {
  const config = getConfig()
  const response = await apiClient<OrderNoteData>(
    `${config.PLST_API_URL}/${playlistId}/order/${orderId}/note`,
    {
      method: 'PUT',
      data: payload,
      withCredentials: true,
    },
  )
  return response.data
}

export const deleteOrderNote = async (
  playlistId: string,
  orderId: string,
): Promise<boolean> => {
  const config = getConfig()
  await apiClient(
    `${config.PLST_API_URL}/${playlistId}/order/${orderId}/note`,
    {
      method: 'DELETE',
      withCredentials: true,
    },
  )
  return true
}
