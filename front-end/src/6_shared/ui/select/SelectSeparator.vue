<script setup lang="ts">
import { SelectSeparator, type SelectSeparatorProps } from 'radix-vue'
import { cn } from '@/6_shared/lib/utils'

const props = defineProps<SelectSeparatorProps & { class?: string }>()
</script>
<template>
  <SelectSeparator v-bind="props" data-slot="select-separator" :class="cn('bg-border pointer-events-none -mx-1 my-1 h-px', props.class)" />
</template>