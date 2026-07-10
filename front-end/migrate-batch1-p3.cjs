const fs = require('fs');
const path = require('path');

const sharedUiDir = path.join(__dirname, 'src', 'shared', 'ui');

const mkdir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

const createFsdComponent = (name, files) => {
  const dir = path.join(sharedUiDir, name);
  mkdir(dir);
  
  let exports = [];
  for (const [filename, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, filename), content);
    if (filename.endsWith('.vue')) {
      const componentName = filename.replace('.vue', '');
      exports.push(`export { default as ${componentName} } from './${filename}'`);
    } else if (filename !== 'index.ts' && filename.endsWith('.ts')) {
      exports.push(`export * from './${filename.replace('.ts', '')}'`);
    }
  }
  
  if (!files['index.ts']) {
    fs.writeFileSync(path.join(dir, 'index.ts'), exports.join('\n') + '\n');
  }
};

// 11. funny-btn
createFsdComponent('funny-btn', {
  'UpDownBtn.vue': `<script setup lang="ts">
import { cn } from '@/shared/lib/utils'

const props = withDefaults(defineProps<{
  getInputRef?: () => HTMLInputElement | null
  class?: string
}>(), {
  getInputRef: () => null
})

const emit = defineEmits<{
  (e: 'upClick'): void
  (e: 'downClick'): void
}>()

const handleAction = (type: 'up' | 'down') => {
  const inputElement = props.getInputRef()
  if (inputElement) {
    if (type === 'up') inputElement.stepUp()
    else inputElement.stepDown()
    
    inputElement.dispatchEvent(new Event('input', { bubbles: true }))
  }

  if (type === 'up') emit('upClick')
  else emit('downClick')
}
</script>

<template>
  <div :class="cn('rounded-(--rounded-std) flex flex-row items-center justify-center h-9', props.class)">
    <button
      @click="handleAction('up')"
      class="pl-2 pr-2 h-full w-full bg-level-2 hover:bg-level-3 active:bg-level-3/50"
    >
      ↑
    </button>
    <button
      @click="handleAction('down')"
      class="pr-2 pl-2 h-full w-full bg-level-2 hover:bg-level-3 active:bg-level-3/50"
    >
      ↓
    </button>
  </div>
</template>`
});

// 12. horizontal-scroll-strip
createFsdComponent('horizontal-scroll-strip', {
  'HorizontalScrollStrip.vue': `<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-vue-next'
import { cn } from '@/shared/lib/utils'

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
</template>`
});

// 13. info-card
createFsdComponent('info-card', {
  'InfoCard.vue': `<script setup lang="ts">
// Using a hardcoded innerPanelClass since the landing feature styles haven't been ported yet
const innerPanelClass = 'bg-level-1 border border-level-3/40 rounded-xl shadow-sm'

defineProps<{
  label: string
  value: string | number
}>()
</script>

<template>
  <div
    :class="[
      innerPanelClass,
      'p-3 sm:p-4 flex flex-col gap-2 transition-colors hover:border-level-3/30'
    ]"
  >
    <div class="flex items-center gap-2 text-text-placeholder">
      <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-level-2/80 text-level-3">
        <slot name="icon" />
      </span>
      <span class="text-[11px] uppercase tracking-wide leading-tight">
        {{ label }}
      </span>
    </div>
    <p class="text-base font-semibold text-text-main pl-9 sm:pl-0 sm:text-center sm:-mt-1">
      {{ value }}
    </p>
  </div>
</template>`
});

// 14. info-card-group
createFsdComponent('info-card-group', {
  'InfoCardGroup.vue': `<script setup lang="ts">
import { InfoCard } from '@/shared/ui/info-card'
import {
  ArrowUpRightIcon,
  ClockIcon,
  EyeIcon,
  ListIcon,
  RefreshCcwIcon,
  SettingsIcon,
  ThumbsUpIcon,
  UserIcon,
} from 'lucide-vue-next'
import { cn } from '@/shared/lib/utils'

// Temporary mock for i18n
const t = (key: string, opts?: any) => {
  if (opts && opts.count !== undefined) return \`\${opts.count}\`
  return key.split('.').pop()
}

defineProps<{
  mode: string
  min_views: number
  min_likes: number
  max_duration: number
  track_cooldown: number
  user_cooldown: number
  max_playlist_size: number
  priorityMode: string
  class?: string
}>()
</script>

<template>
  <div :class="cn('grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3', $props.class)">
    <InfoCard :label="t('playlist.stats.mode')" :value="mode">
      <template #icon><SettingsIcon :size="14" /></template>
    </InfoCard>
    
    <InfoCard :label="t('playlist.stats.minViews')" :value="min_views">
      <template #icon><EyeIcon :size="14" /></template>
    </InfoCard>
    
    <InfoCard :label="t('playlist.stats.minLikes')" :value="min_likes">
      <template #icon><ThumbsUpIcon :size="14" /></template>
    </InfoCard>
    
    <InfoCard :label="t('playlist.stats.maxDuration')" :value="t('playlist.stats.durationSec', { count: max_duration })">
      <template #icon><ClockIcon :size="14" /></template>
    </InfoCard>
    
    <InfoCard :label="t('playlist.stats.trackCd')" :value="t('playlist.stats.cooldownMin', { count: track_cooldown })">
      <template #icon><RefreshCcwIcon :size="14" /></template>
    </InfoCard>
    
    <InfoCard :label="t('playlist.stats.userCd')" :value="t('playlist.stats.cooldownMin', { count: user_cooldown })">
      <template #icon><UserIcon :size="14" /></template>
    </InfoCard>
    
    <InfoCard :label="t('playlist.stats.maxSize')" :value="max_playlist_size || t('playlist.stats.maxSizeUnlimited')">
      <template #icon><ListIcon :size="14" /></template>
    </InfoCard>
    
    <InfoCard :label="t('playlist.stats.priorityMode')" :value="priorityMode">
      <template #icon><ArrowUpRightIcon :size="14" /></template>
    </InfoCard>
  </div>
</template>`
});

// 15. input
createFsdComponent('input', {
  'Input.vue': `<script setup lang="ts">
import { cn } from '@/shared/lib/utils'

const props = defineProps<{ class?: string }>()
</script>

<template>
  <input
    data-slot="input"
    :class="cn(
      'file:text-foreground placeholder:text-text-secondary dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
      'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
      'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
      props.class
    )"
  />
</template>`
});

console.log('Batch 1 part 3 executed successfully.');
