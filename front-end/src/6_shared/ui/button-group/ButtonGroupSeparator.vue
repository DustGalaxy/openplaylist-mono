<script setup lang="ts">
import { Separator } from '@/6_shared/ui/separator'
import { cn } from '@/6_shared/lib/utils'

const props = withDefaults(defineProps<{
  orientation?: 'horizontal' | 'vertical'
  class?: string
}>(), {
  orientation: 'vertical'
})
</script>

<template>
  <Separator
    data-slot="button-group-separator"
    :orientation="orientation"
    :class="cn('relative m-0! self-stretch bg-input data-[orientation=vertical]:h-auto', props.class)"
  />
</template>