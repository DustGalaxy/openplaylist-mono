import { io, Socket } from 'socket.io-client'
import { getConfig } from '@/lib/utils'

let plst_upds_socket: Socket

export const getPlsUpdsSocket = () => {
  if (!plst_upds_socket) {
    plst_upds_socket = io(getConfig().WS_API_URL + '/plst_upds', {
      withCredentials: true,
      path: getConfig().SOCKET_PATH,
      transports: ["websocket"]
    })
  }
  return plst_upds_socket
}

let global_socket: Socket

export const getGlobalSocket = () => {
  if (!global_socket) {
    global_socket = io(getConfig().WS_API_URL, {
      withCredentials: true,
      path: getConfig().SOCKET_PATH,
      transports: ["websocket"]
    })
  }
  return global_socket
}
