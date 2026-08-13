// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { createSyncSlice } from '@/stores/playlistStore/createSyncSlice'
import type { StoreState } from '@/types/playlist'

describe('Moderator Remote Control State', () => {
  const playlistId = '019f147f-4351-7ac2-b5ff-7caba9fc9ff2'

  it('should toggle remote control mode for playlist', () => {
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

    slice.setRemoteControlMode(playlistId, true)
    expect(localUpdates.isRemoteControlMode).toBe(true)

    slice.setRemoteControlMode(playlistId, false)
    expect(localUpdates.isRemoteControlMode).toBe(false)
  })
})
