import { io } from 'socket.io-client'
import { getConfig } from '@/lib/utils'

let plst_upds_socket

export const getPlsUpdsSocket = () => {
  if (!plst_upds_socket) {
    plst_upds_socket = io(getConfig().WS_API_URL + '/plst_upds', {
      withCredentials: true,
      path: getConfig().SOCKET_PATH,
    })
  }
  return plst_upds_socket
}

let global_socket

export const getGlobalSocket = () => {
  if (!global_socket) {
    global_socket = io(getConfig().WS_API_URL, {
      withCredentials: true,
      path: getConfig().SOCKET_PATH,
    })
  }
  return global_socket
}
