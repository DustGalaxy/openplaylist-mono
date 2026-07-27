// src/routes/view.tsx (или новый роут для просмотра плейлиста)
import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import { Loader } from 'lucide-react'
import { usePlaylistStore } from '@/stores/playlistStore'
import PlaylistViewContent from '@/features/united-playlist/components/PlaylistViewContent'
import { FeatureI18nProvider } from '@/lib/i18n/featureTranslation'

export const Route = createFileRoute('/playlists/$playlistId')({
  component: ViewPlaylistPage,
})

function ViewPlaylistPage() {
  const { playlistId } = Route.useParams()

  useEffect(() => {
    usePlaylistStore.getState().setSlotPlaylist('page', playlistId)
    return () => {
      usePlaylistStore.getState().setSlotPlaylist('page', null)
    }
  }, [playlistId])

  // const slot = usePlaylistStore((s) => s.slots.page)

  // if (!slot) return <Loader /> // covers both "fetching" and "data: null after 403/404"
  return (
    <div className="p-1">
      <FeatureI18nProvider ns="playlist">
        <PlaylistViewContent slot={'page'} />
      </FeatureI18nProvider>
    </div>
  )
}
