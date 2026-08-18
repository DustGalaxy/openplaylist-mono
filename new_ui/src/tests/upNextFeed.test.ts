// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useUpNextFeed } from '@/hooks/useUpNextFeed'
import { usePlaylistStore } from '@/stores/playlistStore'
import { DEFAULT_SORT, Platform, PlaylistMode, type Track } from '@/types/playlist'

const makeTrack = (id: string, priority = 0, createdAt = '2026-01-01T00:00:00Z'): Track => ({
  id,
  playlist_id: 'pl-1',
  yt_video_id: `yt-${id}`,
  title: `Track ${id}`,
  priority,
  duration: '180',
  requester_nickname: 'user',
  created_at: createdAt,
  source: Platform.Web,
  extra_data: {},
})

describe('useUpNextFeed', () => {
  it('returns empty array when playlist does not exist', () => {
    const { result } = renderHook(() => useUpNextFeed('non-existent', null, 3))
    expect(result.current).toEqual([])
  })

  it('returns next tracks in queue after current playing track with default sort', () => {
    const tracks = [makeTrack('t1'), makeTrack('t2'), makeTrack('t3'), makeTrack('t4')]
    usePlaylistStore.setState({
      cache: {
        'pl-1': {
          data: {
            id: 'pl-1',
            owner_id: 'u1',
            owner_nickname: 'User',
            name: 'Stream Playlist',
            tags: [],
            is_public: true,
            is_favorite: false,
            favorites_count: 0,
            is_allow_external_requests: true,
            allow_sources: [],
            track_data: tracks,
            background_track_ids: [],
            max_playlist_size: 100,
            mode: PlaylistMode.Stream,
            repeat_mode: 'none',
            mode_settings: {
              flow: { priority_break_point: 0, sort_settings_vip: DEFAULT_SORT, sort_settings_regular: DEFAULT_SORT },
              static: { priority_break_point: 0, sort_settings_vip: DEFAULT_SORT, sort_settings_regular: DEFAULT_SORT },
              stream: { priority_break_point: 0, sort_settings_vip: DEFAULT_SORT, sort_settings_regular: DEFAULT_SORT },
            },
            sync_playback_position: false,
            cost_mode: 'add',
            track_black_list: [],
            content_settings: [],
            block_list: [],
            donation_rules: [],
            chat_rules: [],
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
            now_playing: undefined,
          },
          local: {} as any,
          remote: {} as any,
        },
      },
    })

    const { result } = renderHook(() => useUpNextFeed('pl-1', 't1', 2))
    expect(result.current.map((t) => t.id)).toEqual(['t2', 't3'])
  })

  it('correctly sorts Up Next queue based on priority and sortByRules', () => {
    // Tracks in arbitrary array order: t1 (currently playing), tLow (priority 1), tHigh (priority 10), tMid (priority 5)
    const tracks = [
      makeTrack('t1', 0, '2026-01-01T00:00:00Z'),
      makeTrack('tLow', 1, '2026-01-01T00:00:01Z'),
      makeTrack('tHigh', 10, '2026-01-01T00:00:02Z'),
      makeTrack('tMid', 5, '2026-01-01T00:00:03Z'),
    ]

    usePlaylistStore.setState({
      cache: {
        'pl-1': {
          data: {
            id: 'pl-1',
            owner_id: 'u1',
            owner_nickname: 'User',
            name: 'Stream Playlist',
            tags: [],
            is_public: true,
            is_favorite: false,
            favorites_count: 0,
            is_allow_external_requests: true,
            allow_sources: [],
            track_data: tracks,
            background_track_ids: [],
            max_playlist_size: 100,
            mode: PlaylistMode.Stream,
            repeat_mode: 'none',
            mode_settings: {
              flow: { priority_break_point: 0, sort_settings_vip: DEFAULT_SORT, sort_settings_regular: { order_mode: 'host', date: 'desc', priority: 'desc', manual_order_ids: [] } },
              static: { priority_break_point: 0, sort_settings_vip: DEFAULT_SORT, sort_settings_regular: { order_mode: 'host', date: 'desc', priority: 'desc', manual_order_ids: [] } },
              stream: { priority_break_point: 0, sort_settings_vip: DEFAULT_SORT, sort_settings_regular: { order_mode: 'host', date: 'desc', priority: 'desc', manual_order_ids: [] } },
            },
            sync_playback_position: false,
            cost_mode: 'add',
            track_black_list: [],
            content_settings: [],
            block_list: [],
            donation_rules: [],
            chat_rules: [],
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
            now_playing: undefined,
          },
          local: {} as any,
          remote: {} as any,
        },
      },
    })

    // Expecting order sorted by priority desc: tHigh (10) -> tMid (5) -> tLow (1) -> t1 (0)
    // If t1 is playing (lowest priority), next with limit 2 are tHigh, tMid (wrap-around or from top)
    const { result } = renderHook(() => useUpNextFeed('pl-1', 'tHigh', 2))
    expect(result.current.map((t) => t.id)).toEqual(['tMid', 'tLow'])
  })
})
