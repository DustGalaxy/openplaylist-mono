import type { SocketLike } from '@/types/playlist'

export function safeEmit(
  socket: SocketLike | null | undefined,
  event: string,
  data?: unknown,
): void {
  if (!socket) return
  if (typeof socket.emit === 'function') {
    socket.emit(event, data)
  }
}
