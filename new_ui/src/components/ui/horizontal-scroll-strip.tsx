import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

const SCROLL_EPSILON = 2
const SCROLL_STEP_RATIO = 0.75

function ScrollButton({
  direction,
  onClick,
}: {
  direction: 'left' | 'right'
  onClick: () => void
}) {
  const Icon = direction === 'left' ? ChevronLeft : ChevronRight

  return (
    <button
      type="button"
      aria-label={direction === 'left' ? 'Scroll left' : 'Scroll right'}
      onClick={onClick}
      className={cn(
        'flex h-9 w-9 shrink-0 items-center justify-center rounded-(--rounded-std)',
        'border border-accent/35 bg-level-2/95 text-text-secondary',
        'shadow-[0_4px_16px_rgba(0,0,0,0.35)] transition-colors',
        'hover:border-accent/60 hover:bg-level-2 hover:text-accent',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
      )}
    >
      <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
    </button>
  )
}

export function HorizontalScrollStrip({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const { scrollLeft, scrollWidth, clientWidth } = el
    setCanScrollLeft(scrollLeft > SCROLL_EPSILON)
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - SCROLL_EPSILON)
  }, [])

  const scrollByStep = useCallback((direction: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    const delta =
      el.clientWidth * SCROLL_STEP_RATIO * (direction === 'left' ? -1 : 1)
    el.scrollBy({ left: delta, behavior: 'smooth' })
  }, [])

  useLayoutEffect(() => {
    const scrollEl = scrollRef.current
    const contentEl = contentRef.current
    if (!scrollEl) return

    updateScrollState()
    scrollEl.addEventListener('scroll', updateScrollState, { passive: true })
    const resizeObserver = new ResizeObserver(updateScrollState)
    resizeObserver.observe(scrollEl)
    if (contentEl) resizeObserver.observe(contentEl)

    return () => {
      scrollEl.removeEventListener('scroll', updateScrollState)
      resizeObserver.disconnect()
    }
  }, [updateScrollState, children])

  return (
    <div className={cn('flex min-w-0 flex-1 items-center gap-1.5', className)}>
      {canScrollLeft && (
        <ScrollButton direction="left" onClick={() => scrollByStep('left')} />
      )}

      <div className="relative min-w-0 flex-1">
        {canScrollLeft && (
          <div
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-level-1 via-level-1/80 to-transparent"
            aria-hidden
          />
        )}
        {canScrollRight && (
          <div
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-level-1 via-level-1/80 to-transparent"
            aria-hidden
          />
        )}

        <div
          ref={scrollRef}
          className="overflow-x-auto overscroll-x-contain pb-1 no-native-scrollbar"
        >
          <div ref={contentRef} className="flex w-max min-w-full gap-1">
            {children}
          </div>
        </div>
      </div>

      {canScrollRight && (
        <ScrollButton direction="right" onClick={() => scrollByStep('right')} />
      )}
    </div>
  )
}
