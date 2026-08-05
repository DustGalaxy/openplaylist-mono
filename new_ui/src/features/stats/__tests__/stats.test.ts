import { describe, expect, it, vi } from 'vitest'
import { formatSecondsToReadable } from '../components/widgets/KpiCard'
import * as statsApi from '../api/statsApi'
import apiClient from '@/lib/axios'

vi.mock('@/lib/axios', () => ({
  default: {
    get: vi.fn(),
    patch: vi.fn(),
  },
}))

vi.mock('@/lib/utils', () => ({
  getConfig: () => ({
    API_URL: 'http://localhost:8000/api',
  }),
  cn: (...inputs: string[]) => inputs.filter(Boolean).join(' '),
}))

describe('Stats Feature - Utility Functions', () => {
  it('formats seconds correctly into readable hours and minutes', () => {
    expect(formatSecondsToReadable(0)).toBe('0m')
    expect(formatSecondsToReadable(45)).toBe('0m')
    expect(formatSecondsToReadable(120)).toBe('2m')
    expect(formatSecondsToReadable(3660)).toBe('1h 1m')
    expect(formatSecondsToReadable(7200)).toBe('2h 0m')
    expect(formatSecondsToReadable(87575)).toBe('24h 19m')
  })
})

describe('Stats Feature - API Service', () => {
  it('calls getOutgoingStats with period parameter', async () => {
    const mockData = {
      total_orders: 10,
      total_duration_seconds: 1200,
      top_tracks: [],
      top_streamers: [],
      platform_breakdown: [],
      status_breakdown: [],
    }
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockData })

    const res = await statsApi.getOutgoingStats('7d')
    expect(apiClient.get).toHaveBeenCalledWith(
      'http://localhost:8000/api/stats/outgoing',
      {
        params: { period: '7d' },
        withCredentials: true,
      },
    )
    expect(res).toEqual(mockData)
  })

  it('calls getIncomingStats with default 30d period parameter', async () => {
    const mockData = {
      total_orders: 5,
      total_duration_seconds: 600,
      top_tracks: [],
      top_requesters: [],
      platform_breakdown: [],
    }
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockData })

    const res = await statsApi.getIncomingStats()
    expect(apiClient.get).toHaveBeenCalledWith(
      'http://localhost:8000/api/stats/incoming',
      {
        params: { period: '30d' },
        withCredentials: true,
      },
    )
    expect(res).toEqual(mockData)
  })

  it('calls getGlobalStats', async () => {
    const mockData = {
      total_orders: 258,
      total_duration_seconds: 87575,
      top_tracks: [],
      platform_breakdown: [],
    }
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockData })

    const res = await statsApi.getGlobalStats('all_time')
    expect(apiClient.get).toHaveBeenCalledWith(
      'http://localhost:8000/api/stats/global',
      {
        params: { period: 'all_time' },
      },
    )
    expect(res).toEqual(mockData)
  })

  it('calls getUserPublicStats for target user id', async () => {
    const mockData = {
      user_id: 'user-123',
      period: '30d',
      outgoing: null,
      incoming: null,
    }
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockData })

    const res = await statsApi.getUserPublicStats('user-123', '30d')
    expect(apiClient.get).toHaveBeenCalledWith(
      'http://localhost:8000/api/stats/users/user-123/public',
      {
        params: { period: '30d' },
      },
    )
    expect(res).toEqual(mockData)
  })

  it('calls updateStatsPrivacy with patch payload', async () => {
    const mockData = {
      show_outgoing_stats: true,
      show_incoming_stats: false,
      show_top_tracks: true,
      show_top_streamers: true,
      show_top_requesters: true,
      show_donations: false,
      show_moderation_stats: false,
    }
    vi.mocked(apiClient.patch).mockResolvedValueOnce({ data: mockData })

    const res = await statsApi.updateStatsPrivacy({ show_incoming_stats: false })
    expect(apiClient.patch).toHaveBeenCalledWith(
      'http://localhost:8000/api/stats/me/privacy',
      { show_incoming_stats: false },
      { withCredentials: true },
    )
    expect(res).toEqual(mockData)
  })
})
