<script setup lang="ts">
import { Label, type LabelProps } from 'radix-vue'
import { cn } from '@/6_shared/lib/utils'

const props = defineProps<LabelProps & { class?: string }>()
</script>

<template>
  <Label
    v-bind="props"
    data-slot="label"
    :class="cn('flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50', props.class)"
  >
    <slot />
  </Label>
</template>