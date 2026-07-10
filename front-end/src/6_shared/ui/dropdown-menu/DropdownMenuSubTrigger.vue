<script setup lang="ts">
import { DropdownMenuSubTrigger, type DropdownMenuSubTriggerProps } from 'radix-vue'
import { ChevronRightIcon } from 'lucide-vue-next'
import { cn } from '@/6_shared/lib/utils'

const props = defineProps<DropdownMenuSubTriggerProps & { class?: string, inset?: boolean }>()
</script>
<template>
  <DropdownMenuSubTrigger
    v-bind="props"
    data-slot="dropdown-menu-sub-trigger"
    :data-inset="inset"
    :class="cn('focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[inset]:pl-8', props.class)"
  >
    <slot />
    <ChevronRightIcon class="ml-auto size-4" />
  </DropdownMenuSubTrigger>
</template>