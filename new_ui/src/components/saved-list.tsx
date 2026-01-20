import OrderMiniCard from './order-mini-card'
import type { ClientPlaylist } from '@/types/playlist'
import { useSavedStore } from '@/stores/savedStore'

export default function SavedList({ playlist }: { playlist: ClientPlaylist }) {
  const { tracks } = useSavedStore()
  return (
    <div className="gap-y-8 flex flex-col">
      {tracks.length > 0 ? (
        tracks.map((track) => (
          <OrderMiniCard
            playlist={playlist}
            track={track}
            btns_type="non-playlist"
          />
        ))
      ) : (
        <p className="text-muted-foreground">No saved tracks</p>
      )}
    </div>
  )
}
