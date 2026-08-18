import { describe, expect, it } from 'vitest'
import { usePlaybackStore } from '@/stores/playbackStore'

describe('playbackStore', () => {
  it('updates playerMode between listen and control', () => {
    expect(usePlaybackStore.getState().playerMode).toBe('listen')

    usePlaybackStore.getState().setPlayerMode('control')
    expect(usePlaybackStore.getState().playerMode).toBe('control')

    usePlaybackStore.getState().setPlayerMode('listen')
    expect(usePlaybackStore.getState().playerMode).toBe('listen')
  })

  it('manages activeChannel and broadcastToWidget', () => {
    expect(usePlaybackStore.getState().activeChannel).toBeNull()
    expect(usePlaybackStore.getState().broadcastToWidget).toBe(true)

    usePlaybackStore.getState().setActiveChannel({
      owner_id: 'channel-123',
      name: 'Streamer Channel',
      is_owner: false,
      can_control_player: true,
      can_manage_all_playlists: false,
    })

    expect(usePlaybackStore.getState().activeChannel?.owner_id).toBe('channel-123')
    expect(usePlaybackStore.getState().activeChannel?.name).toBe('Streamer Channel')

    usePlaybackStore.getState().setBroadcastToWidget(false)
    expect(usePlaybackStore.getState().broadcastToWidget).toBe(false)
  })
})
