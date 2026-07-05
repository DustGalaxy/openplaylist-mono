// features/playlist/components/dnd/ReorderRail.tsx
import { GripVertical, ChevronUp, ChevronDown } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { usePlaylist } from '@/features/playlist/context/playlist-context'

export type ReorderMode = 'dnd' | 'arrows'

export function ReorderRail({
  id,
  mode,
  isFirst,
  isLast,
  isActive,
  onMove,
  children,
}: {
  id: string
  mode: ReorderMode
  isFirst: boolean
  isLast: boolean
  isActive: boolean,
  onMove: (dir: 'up' | 'down') => void
  children: (isDragging: boolean) => React.ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id, disabled: mode !== 'dnd' })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition: isDragging ? undefined : transition,
        // Плейсхолдер вместо летающей копии — реальный визуал в DragOverlay
        opacity: isDragging ? 0 : 1,
      }}

      className="flex items-stretch gap-3 min-h-22"
    >
      <div className="flex-1 min-w-0">{children(isDragging)}</div>
      <div
        className={`flex flex-col items-center  justify-center w-6 shrink-0 cursor-grab active:cursor-grabbing rounded-sm bg-level-2  border border-level-3/15 ${mode === 'arrows' ? '' : ''
          } ${isActive ? 'block' : 'hidden'}`}
        {...attributes}
        {...listeners}
      >
        {mode === 'dnd' ? (
          <div
            aria-label="Drag to reorder"
            style={{ touchAction: 'none' }} // критично: только тут, не на карточке/списке
            className="w-full  flex items-center justify-center  text-text-placeholder hover:text-level-3 active:bg-level-1/40"
          >
            <GripVertical className="h-4 w-4" />
          </div>
        ) : (
          <>
            <button
              disabled={isFirst}
              onClick={() => onMove('up')}
              aria-label="Move up"
              className="flex-1 min-h-11 w-full flex items-center justify-center disabled:opacity-20 text-text-placeholder hover:text-level-3 active:bg-level-1/40"
            >
              <ChevronUp className="h-3.5 w-3.5" />
            </button>
            <div className="h-px w-3 bg-white/5" />
            <button
              disabled={isLast}
              onClick={() => onMove('down')}
              aria-label="Move down"
              className="flex-1 min-h-11 w-full flex items-center justify-center disabled:opacity-20 text-text-placeholder hover:text-level-3 active:bg-level-1/40"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>

    </div>
  )
}