<script setup lang="ts">
import { cn } from '@/6_shared/lib/utils'

const props = defineProps<{
  text?: string
  isActive?: boolean
  disabled?: boolean
  class?: string
}>()

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()
</script>

<template>
  <button
    @click="(e) => emit('click', e)"
    :disabled="disabled"
    :class="cn(
      `pt-0.5 pb-0.75 sm:pt-1 sm:pb-1.25 cursor-pointer transition-all text-text-main [&_svg]:text-text-main duration-100 ease-out rounded-(--rounded-std) flex items-center justify-center box-border ring-1 ring-level-3/40 border-level-2 bg-level-2
      hover:text-shadow-[0_0_4px_rgba(255,255,255,0.8),0_0_25px_rgba(255,255,255,0.4)]
      hover:[&_svg]:drop-shadow-[0_0_4px_rgba(255,255,255,0.8)]
      disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:shadow-none disabled:hover:text-shadow-none disabled:[&_svg]:drop-shadow-none disabled:active:shadow-none disabled:translate-y-0`,
      isActive !== undefined
        ? isActive
          ? 'transform translate-y-0 shadow-[0_0px_0_0_var(--color-level-3),0_1px_2px_0_rgba(0,0,0,0.3)]'
          : '-translate-y-0.75 sm:-translate-y-1.25 shadow-[0_3px_0_0_var(--color-level-3),0_4px_5px_-1px_rgba(0,0,0,0.5)] sm:shadow-[0_3px_0_0_var(--color-level-3),0_5px_8px_-1px_rgba(0,0,0,0.55)]'
        : 'transform -translate-y-0.75 sm:-translate-y-1.25 active:translate-y-0 shadow-[0_3px_0_0_var(--color-level-3),0_4px_5px_-1px_rgba(0,0,0,0.5)] sm:shadow-[0_3px_0_0_var(--color-level-3),0_5px_8px_-1px_rgba(0,0,0,0.55)] active:shadow-[0_0px_0_0_var(--color-level-3),0_1px_2px_0_rgba(0,0,0,0.3)]',
      props.class
    )"
  >
    <slot>{{ text }}</slot>
  </button>
</template>