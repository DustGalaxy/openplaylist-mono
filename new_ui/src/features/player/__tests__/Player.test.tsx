// @vitest-environment jsdom
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import React from 'react'
import Player from '../Player'
import type { PlaybackFeed } from '../types'
import { usePlaylistStore } from '@/stores/playlistStore'
import { usePlaybackStore } from '@/stores/playbackStore'
import { useAppSettingsStore } from '@/stores/appSettingsStore'

// Polyfill ResizeObserver for Radix UI Slider in jsdom
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Mock react-player
vi.mock('react-player', () => ({
  default: React.forwardRef((props: any, ref: any) => {
    return <div data-testid="mock-react-player" />
  }),
}))

// Mock translations
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string, options?: Record<string, any>) => {
      if (key === 'trackInfo.playlistTitle' && options?.name) {
        return `Плейлист: ${options.name}`
      }
      if (key === 'trackInfo.order' && options?.nickname) {
        return `Заказ: ${options.nickname}`
      }
      if (key === 'controls.repeatStatus' && options?.mode) {
        return `Повтор: ${options.mode}`
      }
      return fallback || key
    },
  }),
}))

// Mock api-moderators
vi.mock('@/api/api-moderators', () => ({
  fetchModeratedChannels: vi.fn().mockResolvedValue([]),
}))

// Mock audio keep-alive and media session
vi.mock('../hooks/useAudioKeepAlive', () => ({
  useAudioKeepAlive: vi.fn(),
}))

vi.mock('../hooks/useMediaSession', () => ({
  useMediaSession: vi.fn(),
}))

const makeMockFeed = (overrides?: Partial<PlaybackFeed>): PlaybackFeed => ({
  feedId: 'main',
  nowPlayingTrack: {
    id: 'tr-1',
    playlist_id: 'pl-1',
    yt_video_id: 'abc1234',
    title: 'Test Song Title',
    author: 'Test Artist',
    priority: 0,
    duration: '200',
    requester_nickname: 'ViewerBob',
    from_owner: false,
  },
  playing: false,
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
  ...overrides,
})

describe('Player component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    usePlaybackStore.setState({ playerMode: 'listen' })
    useAppSettingsStore.setState({
      settings: {
        playerVolume: 0.8,
        playerMutedVolume: 0.8,
        playerPlaybackRate: 1,
        playerHidden: true,
      } as any,
    })
  })

  afterEach(() => {
    cleanup()
  })

  it('renders track title, author, requester, and controls', () => {
    const feed = makeMockFeed()
    render(<Player feed={feed} />)

    expect(screen.getByText('Test Song Title')).toBeDefined()
    expect(screen.getByText('Test Artist')).toBeDefined()
    expect(screen.getByText('Заказ: ViewerBob')).toBeDefined()
    expect(screen.getByRole('button', { name: /воспроизведение/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /случайный порядок/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /предыдущий трек/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /следующий трек/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /повтор: без повтора/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /выключить звук/i })).toBeDefined()
    expect(screen.getByRole('button', { name: /показать\/скрыть видеоплеер/i })).toBeDefined()
  })

  it('renders preview badge when feedId is single', () => {
    const feed = makeMockFeed({ feedId: 'single' })
    render(<Player feed={feed} />)

    expect(screen.getByText('Предпросмотр')).toBeDefined()
  })

  it('renders playlist name if available in playlist store', () => {
    usePlaylistStore.setState({
      slots: { player: { playlistId: 'pl-main' } } as any,
      cache: {
        'pl-main': {
          data: {
            id: 'pl-main',
            name: 'Stream Playlist',
          } as any,
        },
      } as any,
    })

    const feed = makeMockFeed()
    render(<Player feed={feed} />)

    expect(screen.getByText('Stream Playlist')).toBeDefined()
  })

  it('handles play/pause toggle', () => {
    const feed = makeMockFeed({ playing: false })
    render(<Player feed={feed} />)

    const playBtn = screen.getByRole('button', { name: /воспроизведение/i })
    fireEvent.click(playBtn)

    expect(feed.onPlayerStateChange).toHaveBeenCalledWith(true)
  })

  it('handles shuffle and skip actions', () => {
    const feed = makeMockFeed({ shuffle: false })
    render(<Player feed={feed} />)

    const shuffleBtn = screen.getByRole('button', { name: /случайный порядок/i })
    fireEvent.click(shuffleBtn)
    expect(feed.setShuffle).toHaveBeenCalledWith(true)

    const nextBtn = screen.getByRole('button', { name: /следующий трек/i })
    fireEvent.click(nextBtn)
    expect(feed.next).toHaveBeenCalled()

    const prevBtn = screen.getByRole('button', { name: /предыдущий трек/i })
    fireEvent.click(prevBtn)
    expect(feed.prev).toHaveBeenCalled()
  })
})
