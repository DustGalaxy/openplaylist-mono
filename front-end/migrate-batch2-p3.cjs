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

// 11. time-ago
createFsdComponent('time-ago', {
  'TimeAgo.vue': `<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watchEffect, computed } from 'vue'
import { formatDistanceToNow } from 'date-fns'
import { ru, enUS } from 'date-fns/locale'

const props = withDefaults(defineProps<{
  timestamp: number | string | Date
  lang?: string
  class?: string
}>(), {
  lang: 'ru'
})

const locales: Record<string, any> = {
  ru,
  en: enUS,
}

const timeAgoText = ref('')
const tick = ref(0)

let interval: number | undefined

onMounted(() => {
  interval = window.setInterval(() => {
    tick.value++
  }, 60000)
})

onBeforeUnmount(() => {
  if (interval) clearInterval(interval)
})

const dateObj = computed(() => {
  const ts = props.timestamp
  if (ts instanceof Date) return ts
  if (typeof ts === 'string') {
    const utcString = ts.endsWith('Z') ? ts : \`\${ts}Z\`
    return new Date(utcString)
  }
  return new Date(ts)
})

watchEffect(() => {
  // Dependency on tick to trigger re-eval
  tick.value
  
  try {
    timeAgoText.value = formatDistanceToNow(dateObj.value, {
      addSuffix: true,
      locale: locales[props.lang] || locales.ru,
    })
  } catch (e) {
    timeAgoText.value = ''
  }
})
</script>

<template>
  <div :class="props.class">{{ timeAgoText }}</div>
</template>`
});

// 12. toggle
createFsdComponent('toggle', {
  'variants.ts': `import { cva } from 'class-variance-authority'

export const toggleVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium hover:bg-muted hover:text-text-secondary disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none transition-[color,box-shadow] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive whitespace-nowrap",
  {
    variants: {
      variant: {
        default: 'bg-transparent',
        outline: 'border border-input bg-transparent shadow-xs hover:bg-accent hover:text-accent-foreground',
      },
      size: {
        default: 'h-9 px-2 min-w-9',
        sm: 'h-8 px-1.5 min-w-8',
        lg: 'h-10 px-2.5 min-w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)
`,
  'Toggle.vue': `<script setup lang="ts">
import { Toggle, type ToggleProps, type ToggleEmits, useForwardPropsEmits } from 'radix-vue'
import { toggleVariants } from './variants'
import { cn } from '@/shared/lib/utils'

interface ToggleVariantProps {
  variant?: 'default' | 'outline'
  size?: 'default' | 'sm' | 'lg'
}

const props = withDefaults(defineProps<ToggleProps & ToggleVariantProps & { class?: string }>(), {
  variant: 'default',
  size: 'default'
})
const emits = defineEmits<ToggleEmits>()

const forwarded = useForwardPropsEmits(props, emits)
</script>

<template>
  <Toggle
    v-bind="forwarded"
    data-slot="toggle"
    :class="cn(toggleVariants({ variant, size }), props.class)"
  >
    <slot />
  </Toggle>
</template>`
});

// 13. toggle-group
createFsdComponent('toggle-group', {
  'ToggleGroup.vue': `<script setup lang="ts">
import { ToggleGroupRoot, type ToggleGroupRootProps, type ToggleGroupRootEmits, useForwardPropsEmits } from 'radix-vue'
import { provide } from 'vue'
import { cn } from '@/shared/lib/utils'

interface ToggleGroupVariantProps {
  variant?: 'default' | 'outline'
  size?: 'default' | 'sm' | 'lg'
}

const props = withDefaults(defineProps<ToggleGroupRootProps & ToggleGroupVariantProps & { class?: string }>(), {
  variant: 'default',
  size: 'default'
})
const emits = defineEmits<ToggleGroupRootEmits>()

const forwarded = useForwardPropsEmits(props, emits)

provide('toggleGroupContext', { variant: props.variant, size: props.size })
</script>

<template>
  <ToggleGroupRoot
    v-bind="forwarded"
    data-slot="toggle-group"
    :data-variant="variant"
    :data-size="size"
    :class="cn('group/toggle-group flex w-fit items-center rounded-md data-[variant=outline]:shadow-xs', props.class)"
  >
    <slot />
  </ToggleGroupRoot>
</template>`,

  'ToggleGroupItem.vue': `<script setup lang="ts">
import { ToggleGroupItem, type ToggleGroupItemProps, useForwardProps } from 'radix-vue'
import { inject } from 'vue'
import { toggleVariants } from '../toggle/variants'
import { cn } from '@/shared/lib/utils'

interface ToggleGroupVariantProps {
  variant?: 'default' | 'outline'
  size?: 'default' | 'sm' | 'lg'
}

const props = defineProps<ToggleGroupItemProps & ToggleGroupVariantProps & { class?: string }>()
const forwarded = useForwardProps(props)

const context = inject<{ variant?: string, size?: string }>('toggleGroupContext', {})

const finalVariant = () => (context.variant || props.variant || 'default') as any
const finalSize = () => (context.size || props.size || 'default') as any
</script>

<template>
  <ToggleGroupItem
    v-bind="forwarded"
    data-slot="toggle-group-item"
    :data-variant="finalVariant()"
    :data-size="finalSize()"
    :class="cn(
      toggleVariants({ variant: finalVariant(), size: finalSize() }),
      'min-w-0 flex-1 shrink-0 rounded-none shadow-none first:rounded-l-md last:rounded-r-md focus:z-10 focus-visible:z-10 data-[variant=outline]:border-l-0 data-[variant=outline]:first:border-l',
      props.class
    )"
  >
    <slot />
  </ToggleGroupItem>
</template>`
});

// 14. tooltip
createFsdComponent('tooltip', {
  'Tooltip.vue': `<script setup lang="ts">
import { TooltipRoot, type TooltipRootProps, type TooltipRootEmits, useForwardPropsEmits } from 'radix-vue'
import TooltipProvider from './TooltipProvider.vue'

const props = defineProps<TooltipRootProps>()
const emits = defineEmits<TooltipRootEmits>()

const forwarded = useForwardPropsEmits(props, emits)
</script>

<template>
  <TooltipProvider>
    <TooltipRoot v-bind="forwarded" data-slot="tooltip">
      <slot />
    </TooltipRoot>
  </TooltipProvider>
</template>`,

  'TooltipProvider.vue': `<script setup lang="ts">
import { TooltipProvider, type TooltipProviderProps } from 'radix-vue'

const props = withDefaults(defineProps<TooltipProviderProps>(), {
  delayDuration: 0
})
</script>

<template>
  <TooltipProvider v-bind="props" data-slot="tooltip-provider">
    <slot />
  </TooltipProvider>
</template>`,

  'TooltipTrigger.vue': `<script setup lang="ts">
import { TooltipTrigger, type TooltipTriggerProps } from 'radix-vue'

const props = defineProps<TooltipTriggerProps>()
</script>

<template>
  <TooltipTrigger v-bind="props" data-slot="tooltip-trigger">
    <slot />
  </TooltipTrigger>
</template>`,

  'TooltipContent.vue': `<script setup lang="ts">
import { TooltipContent, type TooltipContentProps, TooltipPortal, TooltipArrow, useForwardPropsEmits } from 'radix-vue'
import { cn } from '@/shared/lib/utils'

const props = withDefaults(defineProps<TooltipContentProps & { class?: string }>(), {
  sideOffset: 0
})

const emits = defineEmits<{
  (e: 'escapeKeyDown', event: KeyboardEvent): void
  (e: 'pointerDownOutside', event: Event): void
}>()

const forwarded = useForwardPropsEmits(props, emits)
</script>

<template>
  <TooltipPortal>
    <TooltipContent
      v-bind="forwarded"
      data-slot="tooltip-content"
      :class="cn('bg-primary text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-fit origin-(--radix-tooltip-content-transform-origin) rounded-md px-3 py-1.5 text-xs text-balance', props.class)"
    >
      <slot />
      <TooltipArrow class="bg-primary fill-primary z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px]" />
    </TooltipContent>
  </TooltipPortal>
</template>`
});

console.log('Batch 2 part 3 executed successfully.');
