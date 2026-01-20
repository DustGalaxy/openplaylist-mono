import { useEffect } from 'react'
import { pesronal_rooms_socket } from '@/api/io-sockets'

export function usePersonalRoom(event: string, callback: CallableFunction) {
  useEffect(() => {
    pesronal_rooms_socket.on(event, callback)

    return () => {
      pesronal_rooms_socket.off(event, callback)
    }
  }, [event, callback])
}
