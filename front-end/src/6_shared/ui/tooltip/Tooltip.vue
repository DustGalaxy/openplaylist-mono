<script setup lang="ts">
import { TooltipRoot, type TooltipRootProps, type TooltipRootEmits, useForwardPropsEmits } from 'radix-vue'
import TooltipProvider from './TooltipProvider.vue'

const props = defineProps<TooltipRootProps>()
const emits = defineEmits<TooltipRootEmits>()

const forwarded = useForwardPropsEmits(props, emits)
</script>

<template>
  <TooltipProvider>
    <TooltipRoot v-bind="forwarded" data-slot="tooltip">
      <slot />
    </TooltipRoot>
  </TooltipProvider>
</template>