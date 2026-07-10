<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-vue-next'
import { cn } from '@/6_shared/lib/utils'

const SCROLL_EPSILON = 2
const SCROLL_STEP_RATIO = 0.75

const props = defineProps<{ class?: string }>()

const scrollRef = ref<HTMLDivElement | null>(null)
const contentRef = ref<HTMLDivElement | null>(null)

const canScrollLeft = ref(false)
const canScrollRight = ref(false)

const updateScrollState = () => {
  const el = scrollRef.value
  if (!el) return
  const { scrollLeft, scrollWidth, clientWidth } = el
  canScrollLeft.value = scrollLeft > SCROLL_EPSILON
  canScrollRight.value = scrollLeft + clientWidth < scrollWidth - SCROLL_EPSILON
}

const scrollByStep = (direction: 'left' | 'right') => {
  const el = scrollRef.value
  if (!el) return
  const delta = el.clientWidth * SCROLL_STEP_RATIO * (direction === 'left' ? -1 : 1)
  el.scrollBy({ left: delta, behavior: 'smooth' })
}

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  const el = scrollRef.value
  const contentEl = contentRef.value
  if (!el) return

  updateScrollState()
  el.addEventListener('scroll', updateScrollState, { passive: true })
  
  resizeObserver = new ResizeObserver(updateScrollState)
  resizeObserver.observe(el)
  if (contentEl) resizeObserver.observe(contentEl)
})

onBeforeUnmount(() => {
  if (scrollRef.value) {
    scrollRef.value.removeEventListener('scroll', updateScrollState)
  }
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
})
</script>

<template>
  <div :class="cn('flex min-w-0 flex-1 items-center gap-1.5', props.class)">
    <button
      v-if="canScrollLeft"
      type="button"
      aria-label="Scroll left"
      @click="scrollByStep('left')"
      class="flex h-9 w-9 shrink-0 items-center justify-center rounded-(--rounded-std) border border-level-3/35 bg-level-2/95 text-text-secondary shadow-[0_4px_16px_rgba(0,0,0,0.35)] transition-colors hover:border-level-3/60 hover:bg-level-2 hover:text-level-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-level-3/40"
    >
      <ChevronLeftIcon class="h-4 w-4" stroke-width="2" aria-hidden="true" />
    </button>

    <div class="relative min-w-0 flex-1">
      <div
        v-if="canScrollLeft"
        class="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-level-1 via-level-1/80 to-transparent"
        aria-hidden="true"
      />
      <div
        v-if="canScrollRight"
        class="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-level-1 via-level-1/80 to-transparent"
        aria-hidden="true"
      />

      <div ref="scrollRef" class="overflow-x-auto overscroll-x-contain pb-1 no-native-scrollbar">
        <div ref="contentRef" class="flex w-max min-w-full gap-1">
          <slot />
        </div>
      </div>
    </div>

    <button
      v-if="canScrollRight"
      type="button"
      aria-label="Scroll right"
      @click="scrollByStep('right')"
      class="flex h-9 w-9 shrink-0 items-center justify-center rounded-(--rounded-std) border border-level-3/35 bg-level-2/95 text-text-secondary shadow-[0_4px_16px_rgba(0,0,0,0.35)] transition-colors hover:border-level-3/60 hover:bg-level-2 hover:text-level-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-level-3/40"
    >
      <ChevronRightIcon class="h-4 w-4" stroke-width="2" aria-hidden="true" />
    </button>
  </div>
</template>