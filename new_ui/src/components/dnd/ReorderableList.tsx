// features/playlist/components/dnd/ReorderableList.tsx
import React, { useRef, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  MeasuringStrategy,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type Modifier,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'

/**
 * Клэмпит перетаскиваемый элемент по вертикали строго в пределах границ
 * самого списка (containerRef), а не всего экрана. Экран/окно при этом
 * свободно скроллится авто-скроллом dnd-kit — это два независимых механизма:
 * "докуда можно дотащить визуально" (этот modifier) vs "когда начать
 * скроллить viewport" (autoScroll ниже, слушает позицию указателя, а не
 * transform элемента).
 */
function useClampToListModifier(containerRef: React.RefObject<HTMLElement | null>): Modifier {
  return ({ transform, draggingNodeRect }) => {
    const container = containerRef.current
    if (!container || !draggingNodeRect) return transform

    const bounds = container.getBoundingClientRect()
    const minY = bounds.top - draggingNodeRect.top
    const maxY = bounds.bottom - draggingNodeRect.bottom

    return {
      ...transform,
      y: Math.min(Math.max(transform.y, minY), maxY),
    }
  }
}

export type ReorderMode = 'dnd' | 'arrows'

export function ReorderableList<T extends { id: string }>({
  items,
  orderedIds,
  mode,
  onReorder,
  onStep,
  renderItem,
  renderGhost,
}: {
  items: Array<T>
  orderedIds: Array<string>
  mode: ReorderMode
  onReorder: (nextIds: Array<string>) => void
  onStep: (id: string, dir: 'up' | 'down') => void
  renderItem: (item: T, isFirst: boolean, isLast: boolean, isDragging: boolean) => React.ReactNode
  renderGhost: (item: T) => React.ReactNode
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const clampToList = useClampToListModifier(containerRef)
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const activeItem = items.find((i) => i.id === activeId)

  function handleDragStart(e: DragStartEvent) {
    setActiveId(e.active.id as string)
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null)
    const { active, over } = e
    if (!over || active.id === over.id) return

    const oldIdx = orderedIds.indexOf(active.id as string)
    const newIdx = orderedIds.indexOf(over.id as string)
    if (oldIdx === -1 || newIdx === -1) return

    onReorder(arrayMove(orderedIds, oldIdx, newIdx))
  }

  function handleDragCancel() {
    setActiveId(null)
  }

  return (
    <div ref={containerRef} className="w-full">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        // Строго вертикальная ось + клэмп в границы списка — "не давать
        // сдвигать куда попало". over вычисляется по позиции указателя (не
        // трансформу), так что закленный по X/Y transform не мешает dnd-kit
        // правильно определять, над каким элементом списка находится палец.
        modifiers={[restrictToVerticalAxis, clampToList]}
        measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
        // Порог 0.2 от высоты вьюпорта считается "зоной скролла" у верхнего
        // и нижнего края экрана; acceleration/interval подобраны чтобы на
        // среднем телефоне скролл не дёргался рывками при касании края.
        autoScroll={{ threshold: { x: 0, y: 0.2 }, acceleration: 12, interval: 5 }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-y-1 sm:gap-y-2">
            {items.map((item, i) =>
              React.Children.only(
                <React.Fragment key={item.id}>
                  {renderItem(item, i === 0, i === items.length - 1, item.id === activeId)}
                </React.Fragment>,
              ),
            )}
          </div>

        </SortableContext>

        <DragOverlay dropAnimation={{ duration: 80, easing: 'cubic-bezier(0.2,0,0,1)' }}>
          {activeItem ? renderGhost(activeItem) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}