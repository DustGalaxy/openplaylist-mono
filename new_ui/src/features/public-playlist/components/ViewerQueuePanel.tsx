import React from 'react'
import { UserStar } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import ViewerTrackCard from './ViewerTrackCard'
import type { Track } from '@/types/playlist'
import {
  OrderModeToggle,
  SortButtons,
} from '@/features/playlist/components/sortPanel'
import { ReorderableList } from '@/components/dnd/ReorderableList'
import { ReorderRail } from '@/components/dnd/ReorderRail'
import { MiniCardDragGhost } from '@/components/dnd/DragGhost'
import { cn, formatTime } from '@/lib/utils'
import {
  filterTabActiveClass,
  filterTabBaseClass,
  filterTabInactiveClass,
} from '@/features/landing/styles'

export default function ViewerQueuePanel({
  tracks,
  sort,
  onSortChange,
  activeTrackId,
  isPlaying,
  onPlay,
}: {
  tracks: Array<Track>
  sort: SortSettings
  onSortChange: (next: SortSettings) => void
  activeTrackId: string | undefined
  isPlaying: boolean
  onPlay: (track: Track) => void
}) {
  const orderedIds = tracks.map((t) => t.id)
  const updateSort = (patch: Partial<SortSettings>) =>
    onSortChange({ ...sort, ...patch })
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2 items-center">
        <button
          onClick={() => updateSort({ order_mode: 'host' })}
          className={cn(
            filterTabBaseClass,
            'p-2 text-xs gap-1 flex items-center justify-center',
            sort.order_mode === 'host'
              ? filterTabActiveClass
              : filterTabInactiveClass,
          )}
        >
          <UserStar className="size-4" />
          {t('publicView.sort.host', 'Host like')}
        </button>
        <div className="w-px h-6 bg-text-main/40" />
        <OrderModeToggle
          value={sort.order_mode}
          onChange={(order_mode) => updateSort({ order_mode })}
        />

        {sort.order_mode !== 'host' && (
          <>
            <div className="w-px h-6 bg-text-main/40" />
            <SortButtons sortSettings={sort} onChange={updateSort} />
          </>
        )}
      </div>

      {/* mode всегда 'dnd' — как у хоста, видимость грипа регулирует isActive,
          а не смена mode между dnd/arrows (в этом и была причина сломанной сортировки) */}
      <ReorderableList
        items={tracks}
        orderedIds={orderedIds}
        mode="dnd"
        onReorder={(ids) =>
          onSortChange({ ...sort, order_mode: 'free', manual_order_ids: ids })
        }
        onStep={() => {}}
        renderItem={(track, isFirst, isLast, isDragging) => (
          <ReorderRail
            id={track.id}
            mode="dnd"
            isFirst={isFirst}
            isLast={isLast}
            isActive={sort.order_mode === 'free'}
            onMove={() => {}}
          >
            {() => (
              <ViewerTrackCard
                track={track}
                isActive={track.id === activeTrackId}
                isPlaying={isPlaying}
                isDragging={isDragging}
                onPlay={() => onPlay(track)}
              />
            )}
          </ReorderRail>
        )}
        renderGhost={(track) => (
          <MiniCardDragGhost
            title={track.title}
            duration={formatTime(track.duration ? +track.duration : 0)}
          />
        )}
      />
    </div>
  )
}
