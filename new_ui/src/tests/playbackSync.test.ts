// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/api/api-playlist', () => ({
  fetchPlaylistPublic: vi.fn().mockResolvedValue(null),
}))
vi.mock('@/api/api-user', () => ({
  fetchUserPublic: vi.fn().mockResolvedValue(null),
}))

// Mock localStorage for test environment
const store: Record<string, string> = {}
const localStorageMock = {
  getItem: (key: string) => store[key] || null,
  setItem: (key: string, value: string) => {
    store[key] = value
  },
  removeItem: (key: string) => {
    delete store[key]
  },
  clear: () => {
    for (const key in store) {
      delete store[key]
    }
  },
}

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', { value: localStorageMock })
}

import { createPlaylistCacheSlice } from '@/stores/playlistStore/createPlaylistCacheSlice'
import { CLIENT_ID } from '@/lib/clientId'
import type { StoreState, SyncSeekPayload, SyncPausePayload } from '@/types/playlist'

describe('Playback Synchronization & Echo Filtering', () => {
  const playlistId = '019f147f-4351-7ac2-b5ff-7caba9fc9ff2'

  function createMockStore(overrides: Partial<StoreState> = {}) {
    const listeners: Record<string, Function> = {}
    const mockSocket = {
      on: vi.fn((event: string, handler: Function) => {
        listeners[event] = handler
      }),
      off: vi.fn(),
      emit: vi.fn(),
      disconnect: vi.fn(),
    }

    let state: Partial<StoreState> = {
      cache: {
        [playlistId]: {
          refCount: 1,
          data: { id: playlistId, track_data: [] } as any,
          owner: {} as any,
          local: {
            history: [],
            sortOverride: {} as any,
            repeatMode: 'none',
            shuffle: false,
            paused_background: null,
            paused_regular: null,
            syncSeek: null,
            syncPause: null,
            acceptSync: true,
            pendingResume: null,
            pendingInterrupt: null,
          },
        },
      },
      slots: {
        player: {
          playlistId: playlistId,
          currentTrackId: 'current-track-active',
          selectedTrackId: null,
        },
        search: { playlistId: null, currentTrackId: null, selectedTrackId: null },
        navigation: { playlistId: null, currentTrackId: null, selectedTrackId: null },
        guest: { playlistId: null, currentTrackId: null, selectedTrackId: null },
      },
      socket: undefined,
      getSlotRole: vi.fn(() => 'owner'),
      setPlayerTrack: vi.fn(),
      updateLocal: vi.fn((id: string, patch: any) => {
        if (state.cache && state.cache[id]) {
          state.cache[id].local = { ...state.cache[id].local, ...patch }
        }
      }),
      updatePlaylistData: vi.fn(),
      registerSocketLifecycle: vi.fn(),
      ...overrides,
    }

    const get = () => state as StoreState
    const set = (updater: any) => {
      if (typeof updater === 'function') {
        state = { ...state, ...updater(state) }
      } else {
        state = { ...state, ...updater }
      }
    }

    const slice = createPlaylistCacheSlice(set as any, get as any, {} as any)
    slice.setSocket(mockSocket as any)

    return {
      slice,
      get,
      listeners,
      mockSocket,
      state,
    }
  }

  it('ignores playback_seek event if client_id matches own CLIENT_ID', () => {
    const { listeners, get } = createMockStore()
    const seekHandler = listeners[`playback_seek:${playlistId}`]
    expect(seekHandler).toBeDefined()

    const selfPayload: SyncSeekPayload = {
      position: 45.0,
      track_id: 'old-track-id',
      client_id: CLIENT_ID,
    }

    seekHandler(selfPayload)

    // Should NOT call updateLocal and should NOT change syncSeek
    expect(get().updateLocal).not.toHaveBeenCalled()
    expect(get().setPlayerTrack).not.toHaveBeenCalled()
    expect(get().cache[playlistId].local.syncSeek).toBeNull()
  })

  it('ignores playback_pause event if client_id matches own CLIENT_ID', () => {
    const { listeners, get } = createMockStore()
    const pauseHandler = listeners[`playback_pause:${playlistId}`]
    expect(pauseHandler).toBeDefined()

    const selfPayload: SyncPausePayload = {
      is_paused: true,
      position: 12.0,
      track_id: 'old-track-id',
      client_id: CLIENT_ID,
    }

    pauseHandler(selfPayload)

    expect(get().updateLocal).not.toHaveBeenCalled()
    expect(get().setPlayerTrack).not.toHaveBeenCalled()
    expect(get().cache[playlistId].local.syncPause).toBeNull()
  })

  it('accepts playback_seek from another client_id and updates syncSeek without force-switching player track', () => {
    const { listeners, get } = createMockStore()
    const seekHandler = listeners[`playback_seek:${playlistId}`]

    const remotePayload: SyncSeekPayload = {
      position: 78.5,
      track_id: 'another-track-id',
      client_id: 'remote-client-xyz',
    }

    seekHandler(remotePayload)

    expect(get().updateLocal).toHaveBeenCalledWith(playlistId, { syncSeek: remotePayload })
    // Must NOT call setPlayerTrack on seek
    expect(get().setPlayerTrack).not.toHaveBeenCalled()
  })

  it('accepts playback_pause from another client_id and updates syncPause without force-switching player track', () => {
    const { listeners, get } = createMockStore()
    const pauseHandler = listeners[`playback_pause:${playlistId}`]

    const remotePayload: SyncPausePayload = {
      is_paused: false,
      position: 30.0,
      track_id: 'another-track-id',
      client_id: 'remote-moderator-123',
    }

    pauseHandler(remotePayload)

    expect(get().updateLocal).toHaveBeenCalledWith(playlistId, { syncPause: remotePayload })
    // Must NOT call setPlayerTrack on pause
    expect(get().setPlayerTrack).not.toHaveBeenCalled()
  })

  it('handles player_track_change from remote client and updates track and state', async () => {
    const { listeners, get } = createMockStore()
    const changeHandler = listeners['player_track_change']
    expect(changeHandler).toBeDefined()

    const remotePayload = {
      track: { id: 'new-remote-track', title: 'Remote Song', yt_video_id: 'abc123' },
      playlist_id: playlistId,
      client_id: 'streamer-host-tab',
      owner_id: 'streamer-owner-id',
    }

    await changeHandler(remotePayload)

    expect(get().setPlayerTrack).toHaveBeenCalledWith('new-remote-track')
  })

  it('ignores player_track_change if client_id is own CLIENT_ID', async () => {
    const { listeners, get } = createMockStore()
    const changeHandler = listeners['player_track_change']

    const selfPayload = {
      track: { id: 'my-own-track', title: 'My Song', yt_video_id: 'xyz789' },
      playlist_id: playlistId,
      client_id: CLIENT_ID,
      owner_id: 'streamer-owner-id',
    }

    await changeHandler(selfPayload)

    expect(get().setPlayerTrack).not.toHaveBeenCalled()
  })

  it('handles player_pause from remote client and updates syncPause in current player slot', () => {
    const { listeners, get } = createMockStore()
    const pauseHandler = listeners['player_pause']
    expect(pauseHandler).toBeDefined()

    const remotePayload = {
      is_paused: true,
      position: 42.0,
      client_id: 'remote-controller',
      owner_id: 'owner-id-123',
    }

    pauseHandler(remotePayload)

    expect(get().updateLocal).toHaveBeenCalledWith(playlistId, {
      syncPause: {
        is_paused: true,
        position: 42.0,
        track_id: 'current-track-active',
        client_id: 'remote-controller',
      },
    })
  })

  it('handles player_seek from remote client and updates syncSeek in current player slot', () => {
    const { listeners, get } = createMockStore()
    const seekHandler = listeners['player_seek']
    expect(seekHandler).toBeDefined()

    const remotePayload = {
      position: 88.5,
      client_id: 'remote-controller',
      owner_id: 'owner-id-123',
    }

    seekHandler(remotePayload)

    expect(get().updateLocal).toHaveBeenCalledWith(playlistId, {
      syncSeek: {
        position: 88.5,
        track_id: 'current-track-active',
        client_id: 'remote-controller',
      },
    })
  })
})
