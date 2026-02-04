import { useEffect } from 'react'
import { getPlsUpdsSocket } from '@/api/io-sockets'

export function usePlstUpdates(event: string, callback: CallableFunction) {
  useEffect(() => {
    const plst_upds_socket = getPlsUpdsSocket()
    plst_upds_socket.on(event, callback)

    return () => {
      plst_upds_socket.off(event, callback)
    }
  }, [event, callback])
}
