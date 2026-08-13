// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import type { PlaybackHistoryItem } from '@/api/api-history'

describe('Playback History Utilities & Stats', () => {
  const sampleItems: PlaybackHistoryItem[] = [
    {
      id: 'h-1',
      order_id: 'o-1',
      playlist_id: 'p-1',
      playlist_name: 'Main Stream',
      title: 'Awesome Song 1',
      yt_video_id: 'video_1',
      duration: 180, // 3 mins
      views: 1000,
      likes: 100,
      requester_nickname: 'Alice',
      source: 'web',
      played_at: '2026-08-11T12:00:00Z',
    },
    {
      id: 'h-2',
      order_id: 'o-2',
      playlist_id: 'p-1',
      playlist_name: 'Main Stream',
      title: 'Awesome Song 2',
      yt_video_id: 'video_2',
      duration: 240, // 4 mins
      views: 2000,
      likes: 200,
      requester_nickname: 'Alice',
      source: 'youtube',
      played_at: '2026-08-11T12:30:00Z',
    },
    {
      id: 'h-3',
      order_id: 'o-3',
      playlist_id: 'p-2',
      playlist_name: 'Chill Vibes',
      title: 'Lo-Fi Beat',
      yt_video_id: 'video_3',
      duration: 120, // 2 mins
      views: 500,
      likes: 50,
      requester_nickname: 'Bob',
      source: 'twitch',
      played_at: '2026-08-11T13:00:00Z',
    },
  ]

  it('should calculate total duration in seconds', () => {
    const totalDurationSeconds = sampleItems.reduce(
      (sum, item) => sum + (item.duration || 0),
      0
    )
    expect(totalDurationSeconds).toBe(540) // 180 + 240 + 120
  })

  it('should identify top requester correctly', () => {
    const requesterCounts: Record<string, number> = {}
    sampleItems.forEach((item) => {
      if (item.requester_nickname) {
        requesterCounts[item.requester_nickname] =
          (requesterCounts[item.requester_nickname] || 0) + 1
      }
    })
    const sorted = Object.entries(requesterCounts).sort((a, b) => b[1] - a[1])
    expect(sorted[0][0]).toBe('Alice')
    expect(sorted[0][1]).toBe(2)
  })

  it('should filter items by source platform', () => {
    const youtubeItems = sampleItems.filter((item) => item.source === 'youtube')
    expect(youtubeItems.length).toBe(1)
    expect(youtubeItems[0].title).toBe('Awesome Song 2')
  })
})
