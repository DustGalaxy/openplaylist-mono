import { useTranslation } from 'react-i18next'
import { usePlaylistView } from '../context/playlist-view-context'
import { useTrackActionsContext } from '../hooks/useTrackActionsContext'
import { resolveTrackActions } from '../lib/trackActions'
import TrackCard from './TrackCard'
import type { FeedTrack, SortSettings } from '@/types/playlist'
import { usePlaylistStore } from '@/stores/playlistStore'
import { useAppSettingsStore } from '@/stores/appSettingsStore'
import { ReorderableList } from '@/components/dnd/ReorderableList'
import { ReorderRail } from '@/components/dnd/ReorderRail'
import { MiniCardDragGhost } from '@/components/dnd/DragGhost'

export default function QueueGroup({
  reorderKey,
  items,
  sortSettings,
  showDivider,
  dividerLabel,
  isNowPlaying,
}: {
  reorderKey: 'vip' | 'regular' | 'background' | 'main'
  items: Array<FeedTrack>
  sortSettings: SortSettings
  showDivider?: boolean
  dividerLabel?: string
  isNowPlaying: (trackId: string) => boolean
}) {
  const { slot, role } = usePlaylistView()
  const moveMethod = useAppSettingsStore((s) => s.settings.moveMethod)
  const {
    reorderTrack,
    reorderStepTrack,
    reorderLocalTrack,
    reorderLocalStepTrack,
  } = usePlaylistStore()
  const baseCtx = useTrackActionsContext()

  if (items.length === 0) return null

  const isOwnerLike = role === 'owner' || role === 'operator'
  const isActive =
    sortSettings.order_mode === 'free' ||
    (isOwnerLike && reorderKey === 'background')

  const onReorder = (ids: Array<string>) => {
    if (isOwnerLike)
      reorderTrack(slot, reorderKey as 'vip' | 'regular' | 'background', ids)
    else reorderLocalTrack(slot, ids)
  }

  const onMove = (trackId: string, dir: 'up' | 'down') => {
    if (isOwnerLike)
      reorderStepTrack(
        slot,
        reorderKey as 'vip' | 'regular' | 'background',
        trackId,
        dir,
      )
    else reorderLocalStepTrack(slot, trackId, dir)
  }

  const actions = resolveTrackActions(role, baseCtx)
  const tracks = items.map((i) => i.track)

  return (
    <div>
      {showDivider && (
        <div className="flex flex-col gap-4 relative w-full h-4">
          <div className="absolute left-0 right-0 h-px bg-text-secondary" />
          <div className="absolute left-1/2 transform -translate-x-1/2 text-text-secondary font-mono -translate-y-1/2 bg-level-1 px-4 rounded-full">
            {dividerLabel}
          </div>
        </div>
      )}

      <ReorderableList
        items={tracks}
        orderedIds={tracks.map((t) => t.id)}
        mode={moveMethod}
        onReorder={onReorder}
        onStep={() => {}}
        renderItem={(track, isFirst, isLast, isDragging) => {
          const feedItem = items.find((i) => i.track.id === track.id)!
          return (
            <ReorderRail
              id={track.id}
              mode={moveMethod}
              isFirst={isFirst}
              isLast={isLast}
              isActive={isActive}
              onMove={(dir) => onMove(track.id, dir)}
            >
              {() => (
                <TrackCard
                  track={track}
                  group={feedItem.group}
                  actions={actions}
                  isDragging={isDragging}
                  isNowPlaying={isNowPlaying(track.id)}
                />
              )}
            </ReorderRail>
          )
        }}
        renderGhost={(track) => (
          <MiniCardDragGhost title={track.title} duration={track.duration} />
        )}
      />
    </div>
  )
}
