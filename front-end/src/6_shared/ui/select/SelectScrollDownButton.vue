<script setup lang="ts">
import { SelectScrollDownButton, type SelectScrollDownButtonProps } from 'radix-vue'
import { ChevronDownIcon } from 'lucide-vue-next'
import { cn } from '@/6_shared/lib/utils'

const props = defineProps<SelectScrollDownButtonProps & { class?: string }>()
</script>
<template>
  <SelectScrollDownButton v-bind="props" data-slot="select-scroll-down-button" :class="cn('flex cursor-default items-center justify-center py-1', props.class)">
    <ChevronDownIcon class="size-4 text-text-main" />
  </SelectScrollDownButton>
</template>