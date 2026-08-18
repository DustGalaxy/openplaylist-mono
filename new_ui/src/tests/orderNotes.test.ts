// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { toTrack } from '@/stores/playlistStore/helpers'
import type { Playlist, WireTrack } from '@/types/playlist'
import { Platform } from '@/types/playlist'
import { fetchOrderNote, upsertOrderNote, deleteOrderNote } from '@/api/api-notes'
import apiClient from '@/lib/axios'

vi.mock('@/lib/axios', () => ({
  default: vi.fn(),
}))

if (typeof window !== 'undefined') {
  ;(window as any).appConfig = {
    PLST_API_URL: 'http://localhost:8000/playlist',
  }
}

describe('Order Notes', () => {
  const dummyPlaylist: Playlist = {
    id: 'pl-1',
    owner_id: 'owner-1',
    owner_nickname: 'Owner',
    name: 'My Playlist',
    description: null,
    is_public: true,
    favorites_count: 0,
    is_allow_external_requests: true,
    allow_sources: [],
    mode: 'static',
    repeat_mode: 'none',
    cost_mode: 'max',
    mode_settings: {
      flow: { priority_break_point: 0, sort_settings_vip: { date: 'desc', priority: 'none', order_mode: 'auto', manual_order_ids: [] }, sort_settings_regular: { date: 'desc', priority: 'none', order_mode: 'auto', manual_order_ids: [] } },
      static: { priority_break_point: 0, sort_settings_vip: { date: 'desc', priority: 'none', order_mode: 'auto', manual_order_ids: [] }, sort_settings_regular: { date: 'desc', priority: 'none', order_mode: 'auto', manual_order_ids: [] } },
      stream: { priority_break_point: 0, sort_settings_vip: { date: 'desc', priority: 'none', order_mode: 'auto', manual_order_ids: [] }, sort_settings_regular: { date: 'desc', priority: 'none', order_mode: 'auto', manual_order_ids: [] } },
    },
    sync_playback_position: false,
    tags: [],
    track_black_list: [],
    background_track_ids: [],
    content_settings: [],
    block_list: [],
    donation_rules: [],
    chat_rules: [],
    moderators: [],
    track_data: [],
    max_playlist_size: 0,
    created_at: '2026-08-16T12:00:00Z',
    updated_at: '2026-08-16T12:00:00Z',
  }

  const dummyWireTrack: WireTrack = {
    id: 'track-1',
    request_id: 'req-1',
    owner_id: 'owner-1',
    from_owner: false,
    requester_nickname: 'Viewer1',
    priority: '0',
    yt_video_id: 'abc12345678',
    title: 'Awesome Song',
    duration: 180,
    views: 1000,
    likes: 100,
    source: Platform.Web,
    extra_data: {},
    note: 'Play this after boss fight',
    is_note_public: false,
    created_at: '2026-08-16T12:00:00Z',
    updated_at: '2026-08-16T12:00:00Z',
  }

  it('toTrack preserves note and is_note_public', () => {
    const track = toTrack(dummyWireTrack, dummyPlaylist.id, dummyPlaylist)
    expect(track.note).toBe('Play this after boss fight')
    expect(track.is_note_public).toBe(false)
  })

  it('toTrack handles undefined/null notes gracefully', () => {
    const wireWithoutNote = { ...dummyWireTrack, note: undefined, is_note_public: undefined }
    const track = toTrack(wireWithoutNote, dummyPlaylist.id, dummyPlaylist)
    expect(track.note).toBeUndefined()
    expect(track.is_note_public).toBeUndefined()
  })

  it('fetchOrderNote returns note data from API', async () => {
    const mockData = {
      order_id: 'track-1',
      playlist_id: 'pl-1',
      note: 'Sample note',
      is_public: true,
    }
    vi.mocked(apiClient).mockResolvedValueOnce({ data: mockData } as any)

    const res = await fetchOrderNote('pl-1', 'track-1')
    expect(res).toEqual(mockData)
  })

  it('upsertOrderNote sends PUT request with payload', async () => {
    const mockData = {
      order_id: 'track-1',
      playlist_id: 'pl-1',
      note: 'Updated note',
      is_public: false,
    }
    vi.mocked(apiClient).mockResolvedValueOnce({ data: mockData } as any)

    const res = await upsertOrderNote('pl-1', 'track-1', {
      note: 'Updated note',
      is_public: false,
    })
    expect(res).toEqual(mockData)
    expect(apiClient).toHaveBeenCalledWith(
      expect.stringContaining('/pl-1/order/track-1/note'),
      expect.objectContaining({
        method: 'PUT',
        data: { note: 'Updated note', is_public: false },
      }),
    )
  })

  it('deleteOrderNote sends DELETE request', async () => {
    vi.mocked(apiClient).mockResolvedValueOnce({} as any)

    const res = await deleteOrderNote('pl-1', 'track-1')
    expect(res).toBe(true)
    expect(apiClient).toHaveBeenCalledWith(
      expect.stringContaining('/pl-1/order/track-1/note'),
      expect.objectContaining({
        method: 'DELETE',
      }),
    )
  })
})
