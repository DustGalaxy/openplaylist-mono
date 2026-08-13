// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getModeratorToken,
  removeModeratorToken,
  setModeratorToken,
} from '@/lib/moderatorTokenStorage'
import { createRoleSlice } from '@/stores/playlistStore/createRoleSlice'
import type { Playlist } from '@/types/playlist'

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

describe('Moderator Token Storage', () => {
  const playlistId = '019f147f-4351-7ac2-b5ff-7caba9fc9ff2'
  const token = 'mod_token_1234567890'

  beforeEach(() => {
    localStorage.clear()
  })

  it('should set and retrieve moderator token for specific playlist', () => {
    expect(getModeratorToken(playlistId)).toBeNull()
    setModeratorToken(playlistId, token)
    expect(getModeratorToken(playlistId)).toBe(token)
  })

  it('should remove moderator token for specific playlist', () => {
    setModeratorToken(playlistId, token)
    expect(getModeratorToken(playlistId)).toBe(token)
    removeModeratorToken(playlistId)
    expect(getModeratorToken(playlistId)).toBeNull()
  })
})

describe('Playlist Role Calculation (getRole)', () => {
  const playlistId = '019f147f-4351-7ac2-b5ff-7caba9fc9ff2'
  const ownerId = 'user_owner_uuid_123'
  const otherUserId = 'user_other_uuid_456'

  const mockPlaylist = {
    id: playlistId,
    owner_id: ownerId,
  } as Playlist

  beforeEach(() => {
    localStorage.clear()
  })

  it('should return owner when userId matches playlist owner_id', () => {
    const get = vi.fn()
    const set = vi.fn()
    const slice = createRoleSlice(set, get, {} as any)

    const role = slice.getRole(mockPlaylist, ownerId)
    expect(role).toBe('owner')
  })

  it('should return operator when moderator token is set for playlist even if unauthenticated', () => {
    setModeratorToken(playlistId, 'mod_token_abcd')
    const get = vi.fn()
    const set = vi.fn()
    const slice = createRoleSlice(set, get, {} as any)

    const roleUnauthenticated = slice.getRole(mockPlaylist, null)
    expect(roleUnauthenticated).toBe('operator')

    const roleOtherUser = slice.getRole(mockPlaylist, otherUserId)
    expect(roleOtherUser).toBe('operator')
  })

  it('should return viewer when user is not owner and has no moderator token', () => {
    const get = vi.fn()
    const set = vi.fn()
    const slice = createRoleSlice(set, get, {} as any)

    const roleUnauthenticated = slice.getRole(mockPlaylist, null)
    expect(roleUnauthenticated).toBe('viewer')

    const roleOtherUser = slice.getRole(mockPlaylist, otherUserId)
    expect(roleOtherUser).toBe('viewer')
  })

  it('should return owner when owner opens playlist even if a moderator token exists', () => {
    setModeratorToken(playlistId, 'mod_token_abcd')
    const get = vi.fn()
    const set = vi.fn()
    const slice = createRoleSlice(set, get, {} as any)

    const role = slice.getRole(mockPlaylist, ownerId)
    expect(role).toBe('owner')
  })

  it('should return operator when userId is listed in playlist.moderators as active moderator', () => {
    const modUserId = 'mod_user_789'
    const playlistWithMods = {
      ...mockPlaylist,
      moderators: [
        {
          id: 'mod-1',
          playlist_id: playlistId,
          user_id: modUserId,
          name: 'Mod User',
          user_name: 'ModUsername',
          permissions: { can_manage_queue: true, can_manage_playback: true, can_manage_settings: false },
          is_active: true,
          created_at: '2026-08-11T00:00:00Z',
        },
      ],
    } as Playlist

    const get = vi.fn()
    const set = vi.fn()
    const slice = createRoleSlice(set, get, {} as any)

    const role = slice.getRole(playlistWithMods, modUserId)
    expect(role).toBe('operator')
  })

  it('should return viewer when userId is listed in playlist.moderators but is_active is false', () => {
    const modUserId = 'mod_user_789'
    const playlistWithInactiveMod = {
      ...mockPlaylist,
      moderators: [
        {
          id: 'mod-1',
          playlist_id: playlistId,
          user_id: modUserId,
          name: 'Mod User',
          user_name: 'ModUsername',
          permissions: { can_manage_queue: true, can_manage_playback: true, can_manage_settings: false },
          is_active: false,
          created_at: '2026-08-11T00:00:00Z',
        },
      ],
    } as Playlist

    const get = vi.fn()
    const set = vi.fn()
    const slice = createRoleSlice(set, get, {} as any)

    const role = slice.getRole(playlistWithInactiveMod, modUserId)
    expect(role).toBe('viewer')
  })
})
