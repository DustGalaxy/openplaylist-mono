<script setup lang="ts">
import { Primitive, type PrimitiveProps } from 'radix-vue'
import { cn } from '@/6_shared/lib/utils'

const props = withDefaults(defineProps<PrimitiveProps & { class?: string }>(), {
  as: 'div'
})
</script>

<template>
  <Primitive
    :as="as"
    :as-child="asChild"
    :class="cn('flex items-center gap-2 rounded-md border bg-muted px-4 text-sm font-medium shadow-xs [&_svg]:pointer-events-none [&_svg:not([class*=\'size-\'])]:size-4', props.class)"
  >
    <slot />
  </Primitive>
</template>