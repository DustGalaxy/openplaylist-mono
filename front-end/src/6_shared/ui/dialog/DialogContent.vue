<script setup lang="ts">
import { DialogContent, type DialogContentProps, DialogClose, useForwardPropsEmits } from 'radix-vue'
import { XIcon } from 'lucide-vue-next'
import DialogPortal from './DialogPortal.vue'
import DialogOverlay from './DialogOverlay.vue'
import { cn } from '@/6_shared/lib/utils.ts'
const props = withDefaults(defineProps<DialogContentProps & { class?: string, showCloseButton?: boolean }>(), {
  showCloseButton: true
})
const emits = defineEmits<{
  (e: 'escapeKeyDown', event: KeyboardEvent): void
  (e: 'pointerDownOutside', event: Event): void
  (e: 'focusOutside', event: Event): void
  (e: 'interactOutside', event: Event): void
  (e: 'openAutoFocus', event: Event): void
  (e: 'closeAutoFocus', event: Event): void
}>()
const forwarded = useForwardPropsEmits(props, emits)
</script>
<template>
  <DialogPortal>
    <DialogOverlay />
    <DialogContent
      v-bind="forwarded"
      data-slot="dialog-content"
      :class="cn('bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg', props.class)"
    >
      <slot />
      <DialogClose v-if="showCloseButton" data-slot="dialog-close" class="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-text-secondary absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=\'size-\'])]:size-4">
        <XIcon />
        <span class="sr-only">Close</span>
      </DialogClose>
    </DialogContent>
  </DialogPortal>
</template>