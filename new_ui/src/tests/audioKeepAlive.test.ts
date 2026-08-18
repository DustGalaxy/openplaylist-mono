// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AudioKeepAliveManager, SILENT_WAV_DATA_URI } from '@/lib/audioKeepAlive'

describe('AudioKeepAlive', () => {
  let playMock: ReturnType<typeof vi.fn>
  let pauseMock: ReturnType<typeof vi.fn>
  let originalAudio: typeof window.Audio

  beforeEach(() => {
    playMock = vi.fn().mockResolvedValue(undefined)
    pauseMock = vi.fn()

    originalAudio = window.Audio
    // Mock Audio constructor
    window.Audio = class {
      loop = false
      volume = 1
      src: string
      play = playMock
      pause = pauseMock

      constructor(src: string) {
        this.src = src
      }
    } as unknown as typeof window.Audio
  })

  afterEach(() => {
    window.Audio = originalAudio
    vi.clearAllMocks()
  })

  it('has a valid base64 data uri for silent wav', () => {
    expect(SILENT_WAV_DATA_URI).toMatch(/^data:audio\/wav;base64,/)
  })

  it('initializes and plays silent audio', async () => {
    const manager = new AudioKeepAliveManager()
    expect(manager.getIsPlaying()).toBe(false)

    const result = await manager.play()
    expect(result).toBe(true)
    expect(manager.getIsPlaying()).toBe(true)
    expect(playMock).toHaveBeenCalledTimes(1)
  })

  it('pauses audio when playing', async () => {
    const manager = new AudioKeepAliveManager()
    await manager.play()
    expect(manager.getIsPlaying()).toBe(true)

    manager.pause()
    expect(manager.getIsPlaying()).toBe(false)
    expect(pauseMock).toHaveBeenCalledTimes(1)
  })

  it('does not duplicate play calls when already playing', async () => {
    const manager = new AudioKeepAliveManager()
    await manager.play()
    await manager.play()

    expect(playMock).toHaveBeenCalledTimes(1)
  })

  it('handles autoplay rejection gracefully without throwing', async () => {
    playMock.mockRejectedValueOnce(new DOMException('NotAllowedError', 'NotAllowedError'))

    const manager = new AudioKeepAliveManager()
    const result = await manager.play()

    expect(result).toBe(false)
    expect(manager.getIsPlaying()).toBe(false)
  })
})
