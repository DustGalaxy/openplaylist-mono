<script setup lang="ts">
import { DropdownMenuLabel, type DropdownMenuLabelProps } from 'radix-vue'
import { cn } from '@/6_shared/lib/utils'
const props = defineProps<DropdownMenuLabelProps & { class?: string, inset?: boolean }>()
</script>
<template>
  <DropdownMenuLabel v-bind="props" data-slot="dropdown-menu-label" :data-inset="inset" :class="cn('px-2 py-1.5 text-sm font-medium data-[inset]:pl-8', props.class)">
    <slot />
  </DropdownMenuLabel>
</template>