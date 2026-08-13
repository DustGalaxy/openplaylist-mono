import { io, type Socket } from 'socket.io-client'
import { getConfig } from '@/lib/utils'

let plst_upds_socket: Socket

export const getPlsUpdsSocket = (token?: string | null) => {
  if (!plst_upds_socket) {
    plst_upds_socket = io(getConfig().WS_API_URL + '/plst_upds', {
      withCredentials: true,
      path: getConfig().SOCKET_PATH,
      transports: ['websocket'],
      auth: token ? { token } : undefined,
    })
  } else if (token) {
    const currentAuth = plst_upds_socket.auth as Record<string, any> | undefined
    if (!currentAuth || currentAuth.token !== token) {
      plst_upds_socket.auth = { ...(currentAuth || {}), token }
      plst_upds_socket.disconnect().connect()
    }
  }
  return plst_upds_socket
}

let global_socket: Socket

export const getGlobalSocket = () => {
  if (!global_socket) {
    global_socket = io(getConfig().WS_API_URL, {
      withCredentials: true,
      path: getConfig().SOCKET_PATH,
      transports: ['websocket'],
    })
  }
  return global_socket
}
