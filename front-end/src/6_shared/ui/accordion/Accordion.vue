<script setup lang="ts">
import { AccordionRoot, type AccordionRootProps, type AccordionRootEmits, useForwardPropsEmits } from 'radix-vue'

const props = defineProps<AccordionRootProps>()
const emits = defineEmits<AccordionRootEmits>()
const forwarded = useForwardPropsEmits(props, emits)
</script>

<template>
  <AccordionRoot v-bind="forwarded" data-slot="accordion">
    <slot />
  </AccordionRoot>
</template>