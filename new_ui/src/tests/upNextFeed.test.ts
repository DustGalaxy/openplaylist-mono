// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useUpNextFeed } from '@/hooks/useUpNextFeed'
import { usePlaylistStore } from '@/stores/playlistStore'
import { Platform, PlaylistMode, type Track } from '@/types/playlist'

const makeTrack = (id: string): Track => ({
  id,
  playlist_id: 'pl-1',
  yt_video_id: `yt-${id}`,
  title: `Track ${id}`,
  priority: 0,
  duration: '180',
  requester_nickname: 'user',
  created_at: '2026-01-01T00:00:00Z',
  source: Platform.Web,
  extra_data: {},
})

describe('useUpNextFeed', () => {
  it('returns empty array when playlist does not exist', () => {
    const { result } = renderHook(() => useUpNextFeed('non-existent', null, 3))
    expect(result.current).toEqual([])
  })

  it('returns next tracks in queue after current playing track', () => {
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
              flow: { priority_break_point: 0, sort_settings_vip: {} as any, sort_settings_regular: {} as any },
              static: { priority_break_point: 0, sort_settings_vip: {} as any, sort_settings_regular: {} as any },
              stream: { priority_break_point: 0, sort_settings_vip: {} as any, sort_settings_regular: {} as any },
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
})
