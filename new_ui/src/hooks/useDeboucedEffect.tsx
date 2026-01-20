import { useEffect, useRef } from 'react'

/**
 * Запускает callback через delay мс,
 * если watchedValue остаётся неизменным.
 * При изменении watchedValue таймер сбрасывается.
 */
export function useDebouncedEffect(
  watchedValue: any,
  callback: () => void,
  delay: number = 3000,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // сбрасываем старый таймер
    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    // ставим новый
    timerRef.current = setTimeout(() => {
      callback()
    }, delay)

    // чистим при размонтировании
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [watchedValue, callback, delay])
}
