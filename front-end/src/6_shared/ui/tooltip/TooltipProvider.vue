<script setup lang="ts">
import { TooltipProvider, type TooltipProviderProps } from 'radix-vue'

const props = withDefaults(defineProps<TooltipProviderProps>(), {
  delayDuration: 0
})
</script>

<template>
  <TooltipProvider v-bind="props" data-slot="tooltip-provider">
    <slot />
  </TooltipProvider>
</template>