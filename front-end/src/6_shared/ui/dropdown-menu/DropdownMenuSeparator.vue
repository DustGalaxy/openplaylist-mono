<script setup lang="ts">
import { DropdownMenuSeparator, type DropdownMenuSeparatorProps } from 'radix-vue'
import { cn } from '@/6_shared/lib/utils'
const props = defineProps<DropdownMenuSeparatorProps & { class?: string }>()
</script>
<template>
  <DropdownMenuSeparator v-bind="props" data-slot="dropdown-menu-separator" :class="cn('bg-border -mx-1 my-1 h-px', props.class)" />
</template>