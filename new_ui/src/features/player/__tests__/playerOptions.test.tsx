// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import React from 'react'
import { PlayerOptionsPopover } from '../components/PlayerOptionsPopover'
import { usePlaybackStore } from '@/stores/playbackStore'
import { usePlaylistStore } from '@/stores/playlistStore'
import { useAuthStore } from '@/stores/authStore'
import { setPlayerBroadcastToWidget } from '@/api/api-player'
import { Platform, PlaylistMode, type Track } from '@/types/playlist'
import type { PlaybackFeed } from '../types'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
  }),
}))

vi.mock('@/api/api-player', async (importOriginal) => {
  const actual = await importOriginal<Record<string, any>>()
  return {
    ...actual,
    fetchPlayerState: vi.fn().mockResolvedValue(null),
    setPlayerBroadcastToWidget: vi.fn().mockResolvedValue({}),
  }
})

const makeMockFeed = (): PlaybackFeed => ({
  feedId: 'player:test',
  nowPlayingTrack: undefined,
  playing: true,
  seekSignal: null,
  repeatMode: 'none',
  shuffle: false,
  capabilities: {
    canSkip: true,
    canSeekArbitrary: true,
    canRequestSync: true,
    canStop: true,
  },
  onPlayerStateChange: vi.fn(),
  onEnded: vi.fn(),
  registerPositionGetter: vi.fn(),
  setRepeatMode: vi.fn(),
  setShuffle: vi.fn(),
  next: vi.fn(),
  prev: vi.fn(),
  seek: vi.fn(),
  stop: vi.fn(),
  requestSync: vi.fn(),
})

const makeTrack = (id: string, title: string): Track => ({
  id,
  playlist_id: 'pl-1',
  yt_video_id: `yt-${id}`,
  title,
  priority: 0,
  duration: '180',
  requester_nickname: 'Viewer123',
  created_at: '2026-01-01T00:00:00Z',
  source: Platform.Web,
  extra_data: {},
})

describe('PlayerOptionsPopover', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    useAuthStore.setState({
      user: {
        id: 'user-1',
        username: 'StreamerUser',
        bio: '',
        is_public: true,
        email_confirmed: true,
        avatar_url: '',
      },
      isAuthenticated: true,
    })

    usePlaybackStore.setState({
      playerMode: 'listen',
      activeChannel: {
        owner_id: 'user-1',
        name: 'StreamerUser',
        is_owner: true,
        can_control_player: true,
        can_manage_all_playlists: true,
      },
      moderatedChannels: [],
      broadcastToWidget: true,
    })

    const tracks = [makeTrack('t1', 'Track 1'), makeTrack('t2', 'Track 2'), makeTrack('t3', 'Track 3')]
    usePlaylistStore.setState({
      userId: 'user-1',
      slots: {
        player: { playlistId: 'pl-1', currentTrackId: 't1' },
      } as any,
      cache: {
        'pl-1': {
          data: {
            id: 'pl-1',
            owner_id: 'user-1',
            owner_nickname: 'Streamer',
            name: 'Main Stream Playlist',
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
            mode_settings: {} as any,
            sync_playback_position: false,
            cost_mode: 'add',
            track_black_list: [],
            content_settings: [],
            block_list: [],
            donation_rules: [],
            chat_rules: [],
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
          },
          local: {} as any,
          remote: {} as any,
        },
      },
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('renders trigger button and opens popover', () => {
    const feed = makeMockFeed()
    render(<PlayerOptionsPopover feed={feed} playlistId="pl-1" currentTrackId="t1" />)

    const btn = screen.getByRole('button', { name: /опции и очередь/i })
    expect(btn).toBeDefined()

    fireEvent.click(btn)
    expect(screen.getByText('Опции воспроизведения')).toBeDefined()
    expect(screen.getByText('Режим плеера')).toBeDefined()
    expect(screen.getByText('Трансляция в виджет OBS')).toBeDefined()
  })

  it('toggles player mode between listen and control', () => {
    const feed = makeMockFeed()
    render(<PlayerOptionsPopover feed={feed} playlistId="pl-1" currentTrackId="t1" />)

    fireEvent.click(screen.getByRole('button', { name: /опции и очередь/i }))

    const controlBtn = screen.getByRole('button', { name: /управление/i })
    fireEvent.click(controlBtn)

    expect(usePlaybackStore.getState().playerMode).toBe('control')

    const listenBtn = screen.getByRole('button', { name: /слушаю/i })
    fireEvent.click(listenBtn)

    expect(usePlaybackStore.getState().playerMode).toBe('listen')
  })

  it('toggles OBS widget broadcast state and calls API', () => {
    const feed = makeMockFeed()
    render(<PlayerOptionsPopover feed={feed} playlistId="pl-1" currentTrackId="t1" />)

    fireEvent.click(screen.getByRole('button', { name: /опции и очередь/i }))

    const widgetToggleBtn = screen.getByRole('button', { name: /переключить трансляцию в виджет/i })
    fireEvent.click(widgetToggleBtn)

    expect(usePlaybackStore.getState().broadcastToWidget).toBe(false)
    expect(setPlayerBroadcastToWidget).toHaveBeenCalledWith('user-1', {
      enabled: false,
      client_id: expect.any(String),
    })
  })

  it('renders Up Next tracks and supports deleting a track', async () => {
    const removeTrackMock = vi.fn()
    usePlaylistStore.setState({
      removeTrack: removeTrackMock,
      canActInSlot: () => true,
    } as any)

    const feed = makeMockFeed()
    render(<PlayerOptionsPopover feed={feed} playlistId="pl-1" currentTrackId="t1" />)

    fireEvent.click(screen.getByRole('button', { name: /опции и очередь/i }))

    expect(screen.getByText('Track 2')).toBeDefined()
    expect(screen.getByText('Track 3')).toBeDefined()

    const deleteBtns = screen.getAllByRole('button', { name: /удалить из очереди/i })
    expect(deleteBtns.length).toBe(2)

    fireEvent.click(deleteBtns[0])
    expect(removeTrackMock).toHaveBeenCalledWith('player', 't2', 'removed')
  })

  it('hides channel selector in listen mode and shows it in control mode', () => {
    usePlaybackStore.setState({
      playerMode: 'listen',
      moderatedChannels: [
        {
          moderator_id: 'm1',
          owner_id: 'o1',
          owner_name: 'StreamerNick',
          is_active: true,
          can_control_player: true,
          can_manage_all_playlists: true,
          playlist_access: [],
        },
      ] as any,
    })

    const feed = makeMockFeed()
    render(<PlayerOptionsPopover feed={feed} playlistId="pl-1" currentTrackId="t1" />)

    fireEvent.click(screen.getByRole('button', { name: /опции и очередь/i }))

    // In listen mode, channel selector label is not visible
    expect(screen.queryByText('Канал стрима (Контекст)')).toBeNull()

    // Switch to control mode
    fireEvent.click(screen.getByRole('button', { name: /управление/i }))

    // Now channel selector is visible
    expect(screen.getByText('Канал стрима (Контекст)')).toBeDefined()
    expect(screen.getByText('StreamerNick')).toBeDefined()

    // Click moderated channel
    fireEvent.click(screen.getByText('StreamerNick'))
    expect(usePlaybackStore.getState().activeChannel?.owner_id).toBe('o1')
    expect(usePlaybackStore.getState().activeChannel?.is_owner).toBe(false)

    // Switch back to own channel
    fireEvent.click(screen.getByText('Мой канал (Собственный)'))
    expect(usePlaybackStore.getState().activeChannel?.owner_id).toBe('user-1')
    expect(usePlaybackStore.getState().activeChannel?.is_owner).toBe(true)
  })
})
