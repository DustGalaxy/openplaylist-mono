<script setup lang="ts">
import { TabsRoot, type TabsRootProps, type TabsRootEmits, useForwardPropsEmits } from 'radix-vue'
import { cn } from '@/6_shared/lib/utils'

const props = defineProps<TabsRootProps & { class?: string }>()
const emits = defineEmits<TabsRootEmits>()
const forwarded = useForwardPropsEmits(props, emits)
</script>
<template>
  <TabsRoot v-bind="forwarded" data-slot="tabs" :class="cn('flex flex-col gap-2', props.class)">
    <slot />
  </TabsRoot>
</template>