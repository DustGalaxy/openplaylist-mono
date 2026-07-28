import { Link, Trash } from 'lucide-react'
import { toast } from 'sonner'
import type { TrackCardAction } from '@/features/united-playlist/components/trackParts/types'
import type { SavedTrack } from '@/stores/savedStore'
import TrackActions from '@/features/united-playlist/components/trackParts/TrackActions'
import { useSavedStore } from '@/stores/savedStore'
import { cn } from '@/lib/utils'
import {
  FeatureI18nProvider,
  useFeatureTranslation,
} from '@/lib/i18n/featureTranslation'

export default function SavedTrackCard({ track }: { track: SavedTrack }) {
  const { t } = useFeatureTranslation()
  const { removeTrack } = useSavedStore()

  const copyLink = () => {
    navigator.clipboard.writeText(
      `https://www.youtube.com/watch?v=${track.yt_video_id}`,
    )
    toast.success(t('playlist.track.actions.copied', 'Link copied'))
  }

  const primary: Array<TrackCardAction> = [
    {
      key: 'copyLink',
      icon: Link,
      label: t('playlist.track.actions.copyLink', 'Copy link'),
      onClick: copyLink,
    },
    {
      key: 'remove',
      icon: Trash,
      label: t('saves.track.actions.remove', 'Remove from saved'),
      onClick: () => removeTrack(track.yt_video_id),
    },
  ]

  return (
    <div className={cn('flex items-center gap-2 p-2 rounded-md bg-level-2/50')}>
      <div className="relative">
        <img
          src={`https://img.youtube.com/vi/${track.yt_video_id}/mqdefault.jpg`}
          alt=""
          className="h-10 aspect-video rounded-xs object-cover shrink-0"
        />
        <div className="absolute text-[10px] bottom-0.5 right-0.5 px-1 py-0.25 rounded-md font-mono bg-[#000000a7] text-white">
          {track.duration}
        </div>
      </div>

      <div className="min-w-0 flex-1 flex flex-col">
        <span className="truncate text-sm text-text-main">{track.title}</span>
      </div>
      <FeatureI18nProvider ns="playlist">
        <TrackActions primary={primary} secondary={[]} track={track} />
      </FeatureI18nProvider>
    </div>
  )
}
