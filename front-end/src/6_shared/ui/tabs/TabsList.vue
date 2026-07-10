<script setup lang="ts">
import { TabsList, type TabsListProps } from 'radix-vue'
import { cn } from '@/6_shared/lib/utils'

const props = defineProps<TabsListProps & { class?: string }>()
</script>
<template>
  <TabsList v-bind="props" data-slot="tabs-list" :class="cn('bg-level-2 text-text-secondary grid grid-cols-4 w-fit items-center justify-center rounded-(--rounded-std) p-[3px]', props.class)">
    <slot />
  </TabsList>
</template>