import { useCallback, useRef } from 'react';

export function useThrottle<T extends (...args: any[]) => void>(callback: T, delay: number) {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  const isThrottled = useRef(false)

  return useCallback((...args: Parameters<T>) => {
    if (isThrottled.current) return
    callbackRef.current(...args)
    isThrottled.current = true
    setTimeout(() => {
      isThrottled.current = false
    }, delay)
  }, [delay])
}