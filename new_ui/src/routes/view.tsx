import { createFileRoute } from '@tanstack/react-router'

import type { ClientPlaylist, InputPlaylist } from '@/types/playlist'
import { fetchPlaylistPublic } from '@/api/api-playlist'

import PlaylistViewer from '@/features/public-playlist/components/PlaylistViewer'

export const Route = createFileRoute('/view')({
  validateSearch: (search: Record<string, unknown>) => ({
    p: typeof search.p === 'string' ? search.p : undefined,
  }),
  component: RouteComponent,
  loader: async (ctx) => {
    const searchParams = new URLSearchParams(ctx.location.search)
    const plst_id = searchParams.get('p')
    if (plst_id && plst_id.toString() !== 'undefined') {
      const plst: InputPlaylist | null = await fetchPlaylistPublic(plst_id)

      if (!plst) {
        return { playlist: null }
      }
      const playlist: ClientPlaylist = {
        ...plst,
        isSub: false,
        history: [],
      } as ClientPlaylist

      if (plst.now_playing) {
        playlist.now_playing = plst.track_data.find(
          (t) => t.id === plst.now_playing,
        )
      } else if (!plst.now_playing) {
        plst.now_playing = undefined
      }

      return { playlist }
    }
    return { playlist: null }
  },
})

function RouteComponent() {
  const { playlist } = Route.useLoaderData()

  const { p: playlistIdFromUrl } = Route.useSearch()
  return (
    <PlaylistViewer
      playlist={playlist}
      playlistIdFromUrl={playlistIdFromUrl || null}
    />
  )
}
