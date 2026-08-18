// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { createSyncSlice } from '@/stores/playlistStore/createSyncSlice'
import { usePlaybackStore } from '@/stores/playbackStore'
import type { StoreState } from '@/types/playlist'

describe('Moderator Remote Control & Sync State', () => {
  const playlistId = '019f147f-4351-7ac2-b5ff-7caba9fc9ff2'

  it('should toggle acceptSync for playlist in sync slice', () => {
    let localUpdates: Record<string, any> = {}
    const mockUpdateLocal = (id: string, patch: any) => {
      expect(id).toBe(playlistId)
      localUpdates = { ...localUpdates, ...patch }
    }

    const get = () =>
      ({
        updateLocal: mockUpdateLocal,
      }) as unknown as StoreState

    const slice = createSyncSlice(
      () => {},
      get as any,
      {} as any,
    )

    slice.setAcceptSync(playlistId, true)
    expect(localUpdates.acceptSync).toBe(true)

    slice.setAcceptSync(playlistId, false)
    expect(localUpdates.acceptSync).toBe(false)
  })

  it('should toggle playerMode between listen and control in playbackStore', () => {
    usePlaybackStore.getState().setPlayerMode('control')
    expect(usePlaybackStore.getState().playerMode).toBe('control')

    usePlaybackStore.getState().setPlayerMode('listen')
    expect(usePlaybackStore.getState().playerMode).toBe('listen')
  })
})
