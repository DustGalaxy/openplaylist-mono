<script setup lang="ts">
import { buttonGroupVariants } from './variants'
import { cn } from '@/6_shared/lib/utils'

const props = withDefaults(defineProps<{
  orientation?: 'horizontal' | 'vertical'
  class?: string
}>(), {
  orientation: 'horizontal'
})
</script>

<template>
  <div
    role="group"
    data-slot="button-group"
    :data-orientation="orientation"
    :class="cn(buttonGroupVariants({ orientation }), props.class)"
  >
    <slot />
  </div>
</template>