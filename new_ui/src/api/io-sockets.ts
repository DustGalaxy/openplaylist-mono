import { io } from 'socket.io-client'
import { getConfig } from '@/lib/utils'

export const plst_upds_socket = io(
   
  '/plst_upds',
  {
    withCredentials: true,
    path: '/api/socket.io',
  },
)
// export const pesronal_rooms_socket = io(
//   getConfig().WS_API_URL + '/pesronal_rooms',
// )
