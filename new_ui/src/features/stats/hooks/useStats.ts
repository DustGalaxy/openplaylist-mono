import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getGlobalStats,
  getIncomingStats,
  getOutgoingStats,
  getUserPublicStats,
  updateStatsPrivacy,
} from '../api/statsApi'
import type { StatsPeriod, UserStatsVisibilitySettings } from '../types'

export const STATS_QUERY_KEYS = {
  outgoing: (period: StatsPeriod) => ['stats', 'outgoing', period] as const,
  incoming: (period: StatsPeriod) => ['stats', 'incoming', period] as const,
  global: (period: StatsPeriod) => ['stats', 'global', period] as const,
  userPublic: (userId: string, period: StatsPeriod) =>
    ['stats', 'userPublic', userId, period] as const,
}

export function useOutgoingStats(period: StatsPeriod = '30d', enabled = true) {
  return useQuery({
    queryKey: STATS_QUERY_KEYS.outgoing(period),
    queryFn: () => getOutgoingStats(period),
    enabled,
    staleTime: 1000 * 60 * 5, // 5 min
  })
}

export function useIncomingStats(period: StatsPeriod = '30d', enabled = true) {
  return useQuery({
    queryKey: STATS_QUERY_KEYS.incoming(period),
    queryFn: () => getIncomingStats(period),
    enabled,
    staleTime: 1000 * 60 * 5,
  })
}

export function useGlobalStats(period: StatsPeriod = '30d') {
  return useQuery({
    queryKey: STATS_QUERY_KEYS.global(period),
    queryFn: () => getGlobalStats(period),
    staleTime: 1000 * 60 * 5,
  })
}

export function useUserPublicStats(
  userId?: string | null,
  period: StatsPeriod = '30d',
) {
  return useQuery({
    queryKey: STATS_QUERY_KEYS.userPublic(userId ?? '', period),
    queryFn: () => getUserPublicStats(userId!, period),
    enabled: Boolean(userId),
    staleTime: 1000 * 60 * 5,
  })
}

export function useUpdateStatsPrivacy() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (patch: Partial<UserStatsVisibilitySettings>) =>
      updateStatsPrivacy(patch),
    onSuccess: () => {
      // Invalidate relevant user stats queries
      void queryClient.invalidateQueries({ queryKey: ['stats'] })
      void queryClient.invalidateQueries({ queryKey: ['auth'] })
    },
  })
}
