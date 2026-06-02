import { useTranslation } from 'react-i18next'
import OrderMiniCard from './order-mini-card'
import { useSavedStore } from '@/stores/savedStore'

export default function SavedList() {
  const { t } = useTranslation()
  const { tracks } = useSavedStore()
  return (
    <div className="gap-y-8 flex flex-col">
      {tracks.length > 0 ? (
        tracks.map((track) => (
          <OrderMiniCard
            key={track.yt_video_id}
            track={track}
            btns_type="non-playlist"
          />
        ))
      ) : (
        <p className="text-text-secondary">{t('playlist.saved.empty')}</p>
      )}
    </div>
  )
}
