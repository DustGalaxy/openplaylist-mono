<script setup lang="ts">
import { SelectScrollUpButton, type SelectScrollUpButtonProps } from 'radix-vue'
import { ChevronUpIcon } from 'lucide-vue-next'
import { cn } from '@/6_shared/lib/utils'

const props = defineProps<SelectScrollUpButtonProps & { class?: string }>()
</script>
<template>
  <SelectScrollUpButton v-bind="props" data-slot="select-scroll-up-button" :class="cn('flex cursor-default items-center justify-center py-1', props.class)">
    <ChevronUpIcon class="size-4 text-text-main" />
  </SelectScrollUpButton>
</template>