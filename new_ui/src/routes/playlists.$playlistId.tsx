import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { usePlaylistStore } from '@/stores/playlistStore'
import { useAuthStore } from '@/stores/authStore'
import PlaylistViewContent from '@/features/united-playlist/components/PlaylistViewContent'
import { FeatureI18nProvider } from '@/lib/i18n/featureTranslation'
import { setModeratorToken } from '@/lib/moderatorTokenStorage'
import { claimModeratorToken } from '@/api/api-moderators'
import { queryClient } from '@/routes/__root'

export const Route = createFileRoute('/playlists/$playlistId')({
  component: ViewPlaylistPage,
})

function ViewPlaylistPage() {
  const { playlistId } = Route.useParams()

  useEffect(() => {
    if (typeof window === 'undefined' || !playlistId) return

    const urlParams = new URLSearchParams(window.location.search)
    const modToken = urlParams.get('mod_token')

    if (modToken) {
      setModeratorToken(playlistId, modToken)

      const isAuthenticated = useAuthStore.getState().isAuthenticated
      if (isAuthenticated) {
        claimModeratorToken(playlistId, modToken)
          .then(() => {
            toast.success('Вы успешно активировали модераторский доступ!')
            queryClient.invalidateQueries({ queryKey: ['moderatedPlaylists'] })
          })
          .catch((err) => {
            const detail = err?.response?.data?.detail || ''
            if (detail.includes('owner')) {
              toast.info('Вы являетесь владельцем этого плейлиста')
            } else if (detail.includes('already been claimed')) {
              toast.error('Ссылка модератора уже была привязана к другому аккаунту')
            } else {
              toast.error('Не удалось активировать модераторскую ссылку')
            }
          })
      }

      urlParams.delete('mod_token')
      const newSearch = urlParams.toString()
      const newUrl =
        window.location.pathname +
        (newSearch ? `?${newSearch}` : '') +
        window.location.hash
      window.history.replaceState({}, '', newUrl)
    }

    usePlaylistStore.getState().setSlotPlaylist('page', playlistId)
    return () => {
      usePlaylistStore.getState().setSlotPlaylist('page', null)
    }
  }, [playlistId])

  return (
    <div className="p-1">
      <FeatureI18nProvider ns="playlist">
        <PlaylistViewContent slot={'page'} />
      </FeatureI18nProvider>
    </div>
  )
}
