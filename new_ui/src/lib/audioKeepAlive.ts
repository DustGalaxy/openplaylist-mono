// src/lib/audioKeepAlive.ts

// 1-second silent PCM WAV encoded as Data URI
export const SILENT_WAV_DATA_URI =
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA=='

export class AudioKeepAliveManager {
  private audio: HTMLAudioElement | null = null
  private isPlaying = false

  private init() {
    if (typeof window === 'undefined' || typeof Audio === 'undefined') return
    if (this.audio) return

    try {
      this.audio = new Audio(SILENT_WAV_DATA_URI)
      this.audio.loop = true
      // Volume > 0 ensures Chromium keeps the "audible" tab priority while being effectively silent
      this.audio.volume = 0.01
    } catch (e) {
      console.warn('[AudioKeepAlive] Failed to initialize Audio element', e)
    }
  }

  async play(): Promise<boolean> {
    this.init()
    if (!this.audio) return false

    if (this.isPlaying) return true

    try {
      await this.audio.play()
      this.isPlaying = true
      return true
    } catch (error: unknown) {
      // Browser autoplay policies might reject until the first user interaction
      this.isPlaying = false
      if (error instanceof Error && error.name !== 'AbortError' && error.name !== 'NotAllowedError') {
        console.warn('[AudioKeepAlive] play() failed', error)
      }
      return false
    }
  }

  pause(): void {
    if (this.audio && this.isPlaying) {
      try {
        this.audio.pause()
      } catch {
        // Ignore any pause errors
      }
      this.isPlaying = false
    }
  }

  getIsPlaying(): boolean {
    return this.isPlaying
  }
}

export const audioKeepAlive = new AudioKeepAliveManager()
