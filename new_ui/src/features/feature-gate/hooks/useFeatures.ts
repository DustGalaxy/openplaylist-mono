import { useQuery } from '@tanstack/react-query'
import { fetchMyFeatures } from '@/api/api-features'
import { useAuthStore } from '@/stores/authStore'

export function useFeatures() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  return useQuery({
    queryKey: ['me', 'features'],
    queryFn: fetchMyFeatures,
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000, // 5 мин — тир меняется редко, не нужен агрессивный рефетч
  })
}
