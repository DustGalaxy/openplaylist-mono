// src/features/player/hooks/useAudioKeepAlive.ts
import { useEffect } from 'react'
import { audioKeepAlive } from '@/lib/audioKeepAlive'

export function useAudioKeepAlive(playing: boolean) {
  useEffect(() => {
    if (playing) {
      audioKeepAlive.play()

      const unlockAudio = () => {
        if (playing) {
          audioKeepAlive.play()
        }
      }

      window.addEventListener('pointerdown', unlockAudio, { once: true })
      window.addEventListener('keydown', unlockAudio, { once: true })

      return () => {
        window.removeEventListener('pointerdown', unlockAudio)
        window.removeEventListener('keydown', unlockAudio)
      }
    } else {
      audioKeepAlive.pause()
    }
  }, [playing])

  useEffect(() => {
    return () => {
      audioKeepAlive.pause()
    }
  }, [])
}
