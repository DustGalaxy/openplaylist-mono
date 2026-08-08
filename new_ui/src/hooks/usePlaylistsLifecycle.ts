import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import {
  fetchUserFavoritePlaylists,
  fetchUserPlaylistData,
} from '@/api/api-playlist'
import { useUserPlaylistRecordsStore } from '@/stores/userPlaylistInfoStore'

export function usePlaylistsLifecycle() {
  const { isAuthenticated } = useAuthStore()

  const { data: playlistsData } = useQuery({
    queryKey: ['playlistsData'],
    queryFn: fetchUserPlaylistData,
    enabled: isAuthenticated,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
  })

  const { data: favoritesData } = useQuery({
    queryKey: ['favoritePlaylists'],
    queryFn: fetchUserFavoritePlaylists,
    enabled: isAuthenticated,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchInterval: false,
  })

  useEffect(() => {
    if (!isAuthenticated) {
      useUserPlaylistRecordsStore.getState().clear()
      return
    }

    if (playlistsData) {
      const info = playlistsData.map((p: any) => {
        return { id: p.id, name: p.name }
      })
      useUserPlaylistRecordsStore.getState().set(info)
    }

    if (favoritesData) {
      const favInfo = favoritesData.map((f: any) => {
        return { id: f.id, name: f.name, owner_nickname: f.owner_nickname }
      })
      useUserPlaylistRecordsStore.getState().setFavorites(favInfo)
    }
  }, [isAuthenticated, playlistsData, favoritesData])
}
