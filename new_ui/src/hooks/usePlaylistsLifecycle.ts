// src/hooks/usePlaylistsLifecycle.ts
import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { fetchUserPlaylistData } from '@/api/api-playlist'
import { useUserPlaylistRecordsStore } from '@/stores/userPlaylistInfoStore'

export function usePlaylistsLifecycle() {
  const { isAuthenticated } = useAuthStore()

  const { data: playlistsData, isLoading } = useQuery({
    queryKey: ['playlistsData'],
    queryFn: fetchUserPlaylistData,
    enabled: isAuthenticated,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
  })

  useEffect(() => {
    if (!playlistsData) return
    const info = playlistsData.map((p) => {
      return { id: p.id, name: p.name }
    })
    useUserPlaylistRecordsStore.getState().set(info)
  }, [isAuthenticated, isLoading, playlistsData])
}
