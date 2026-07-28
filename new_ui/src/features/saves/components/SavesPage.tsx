import SavedTrackCard from './SavedTrack'
import { useSavedStore } from '@/stores/savedStore'
import { useFeatureTranslation } from '@/lib/i18n/featureTranslation'

export default function SavesPage() {
  const { t } = useFeatureTranslation()
  const { tracks } = useSavedStore()

  if (tracks.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-text-placeholder text-sm">
        {t('saves.empty', 'No saved tracks yet')}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 p-2">
      {tracks.map((track) => (
        <SavedTrackCard key={track.yt_video_id} track={track} />
      ))}
    </div>
  )
}
