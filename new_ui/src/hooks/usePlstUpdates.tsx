import { useEffect } from 'react'
import { plst_upds_socket } from '@/api/io-sockets'

export function usePlstUpdates(event: string, callback: CallableFunction) {
  useEffect(() => {
    plst_upds_socket.on(event, callback)

    return () => {
      plst_upds_socket.off(event, callback)
    }
  }, [event, callback])
}
