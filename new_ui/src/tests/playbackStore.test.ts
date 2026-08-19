// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { usePlaybackStore, createUserChannel } from '@/stores/playbackStore'
import { useAuthStore } from '@/stores/authStore'
import type { UserProfile } from '@/types/user'

const mockUser: UserProfile = {
  id: 'user-456',
  username: 'TestStreamer',
  bio: '',
  is_public: true,
  email_confirmed: true,
  avatar_url: '',
}

describe('playbackStore', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, isAuthenticated: false })
    usePlaybackStore.setState({
      activePlaybackId: null,
      activeMode: null,
      playerMode: 'listen',
      activeChannel: null,
      moderatedChannels: [],
      broadcastToWidget: true,
      playerState: null,
    })
  })

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

  it('syncs user channel on auth login and reset on logout', () => {
    usePlaybackStore.getState().syncUserChannel(mockUser)

    const channel = usePlaybackStore.getState().activeChannel
    expect(channel).not.toBeNull()
    expect(channel?.owner_id).toBe('user-456')
    expect(channel?.name).toBe('TestStreamer')
    expect(channel?.is_owner).toBe(true)
    expect(channel?.can_control_player).toBe(true)
    expect(channel?.can_manage_all_playlists).toBe(true)

    // Logout
    usePlaybackStore.getState().syncUserChannel(null)
    expect(usePlaybackStore.getState().activeChannel).toBeNull()
  })

  it('defaults setActiveChannel(null) to authenticated user channel', () => {
    useAuthStore.setState({ user: mockUser, isAuthenticated: true })

    // When setting activeChannel to a moderated streamer channel
    usePlaybackStore.getState().setActiveChannel({
      owner_id: 'mod-owner-789',
      name: 'Other Streamer',
      is_owner: false,
      can_control_player: true,
      can_manage_all_playlists: false,
    })
    expect(usePlaybackStore.getState().activeChannel?.owner_id).toBe('mod-owner-789')
    expect(usePlaybackStore.getState().activeChannel?.is_owner).toBe(false)

    // Switching back by passing null
    usePlaybackStore.getState().setActiveChannel(null)
    const ownChannel = usePlaybackStore.getState().activeChannel
    expect(ownChannel).not.toBeNull()
    expect(ownChannel?.owner_id).toBe('user-456')
    expect(ownChannel?.is_owner).toBe(true)
  })

  it('creates active channel object with helper createUserChannel', () => {
    const channel = createUserChannel(mockUser)
    expect(channel.owner_id).toBe('user-456')
    expect(channel.name).toBe('TestStreamer')
    expect(channel.is_owner).toBe(true)
    expect(channel.can_control_player).toBe(true)
    expect(channel.can_manage_all_playlists).toBe(true)
  })
})

