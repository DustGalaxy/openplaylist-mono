<script setup lang="ts">
import { Separator, type SeparatorProps } from 'radix-vue'
import { cn } from '@/6_shared/lib/utils'

const props = withDefaults(defineProps<SeparatorProps & { class?: string }>(), {
  orientation: 'horizontal',
  decorative: true
})
</script>

<template>
  <Separator
    v-bind="props"
    data-slot="separator"
    :class="cn('shrink-0 bg-border data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px', props.class)"
  />
</template>