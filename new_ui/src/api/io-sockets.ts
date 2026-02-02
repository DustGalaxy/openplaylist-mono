import { io } from 'socket.io-client'

export const plst_upds_socket = io('/plst_upds', {
  withCredentials: true,
  path: '/api/socket.io',
})

export const global_socket = io('/', {
  withCredentials: true,
  path: '/api/socket.io',
})
