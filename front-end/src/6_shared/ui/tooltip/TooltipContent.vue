<script setup lang="ts">
import { TooltipContent, type TooltipContentProps, TooltipPortal, TooltipArrow, useForwardPropsEmits } from 'radix-vue'
import { cn } from '@/6_shared/lib/utils'

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
</template>