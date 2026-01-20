import { createFileRoute } from '@tanstack/react-router'
import type { ClientPlaylist } from '@/types/playlist'
import ViewInfoBar from '@/components/ViewInfoBar'
import { fetchPlaylistPublic } from '@/api/api-playlist'

import ViewTrackCard from '@/components/view-track-card'

export const Route = createFileRoute('/view')({
  component: RouteComponent,
  loader: async (ctx) => {
    const searchParams = new URLSearchParams(ctx.location.search)
    console.log('Search Params:', searchParams.toString())
    const plst_id = searchParams.get('p')
    if (plst_id) {
      console.log('Playlist ID:', plst_id)

      const plst: ClientPlaylist = await fetchPlaylistPublic(plst_id)
      if (plst.now_playing) {
        plst.now_playing = plst.track_data.find(
          (t) => t.id === plst.now_playing,
        )
        if (!plst.now_playing) {
          plst.now_playing = undefined
        }
      }

      return { plst }
    }
    return { plst: null }
  },
})

function RouteComponent() {
  const { plst } = Route.useLoaderData()

  if (!plst) {
    return <div className="text-white">Playlist not found</div>
  }

  return (
    <div className="text-white px-6 pt-6 w-full">
      <ViewInfoBar playlist={plst} />
      {/* Track list header */}
      <div className="border-t border-gray-700 pt-4 w-full">
        <h3 className="text-sm uppercase tracking-wide text-gray-400">
          Track list
        </h3>
        {plst.track_data.length === 0 ? (
          <p className="text-sm text-gray-400 mt-2">
            No tracks in this playlist.
          </p>
        ) : (
          <div className="mt-2 flex flex-col gap-4 items-center">
            {plst.track_data.map((track) => (
              <ViewTrackCard track={track} settings={plst.settings} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
