import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import {
  fetchUserFavoritePlaylists,
  fetchUserPlaylistData,
} from '@/api/api-playlist'
import { fetchUserModeratedPlaylists } from '@/api/api-moderators'
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

  const { data: moderatedData } = useQuery({
    queryKey: ['moderatedPlaylists'],
    queryFn: fetchUserModeratedPlaylists,
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

    if (Array.isArray(playlistsData)) {
      const info = playlistsData.map((p: any) => {
        return { id: p.id, name: p.name }
      })
      useUserPlaylistRecordsStore.getState().set(info)
    }

    if (Array.isArray(favoritesData)) {
      const favInfo = favoritesData.map((f: any) => {
        return { id: f.id, name: f.name, owner_nickname: f.owner_nickname }
      })
      useUserPlaylistRecordsStore.getState().setFavorites(favInfo)
    }

    if (Array.isArray(moderatedData)) {
      const modInfo: any[] = []
      for (const channel of moderatedData) {
        if (Array.isArray(channel.playlist_access)) {
          for (const pa of channel.playlist_access) {
            if (pa && pa.playlist_id && pa.playlist_id !== 'undefined') {
              modInfo.push({
                moderator_id: channel.moderator_id,
                id: pa.playlist_id,
                name: pa.playlist_name || `Плейлист (${channel.owner_name})`,
                owner_nickname: channel.owner_name,
              })
            }
          }
        }
      }
      useUserPlaylistRecordsStore.getState().setModerated(modInfo)
    }
  }, [isAuthenticated, playlistsData, favoritesData, moderatedData])
}
