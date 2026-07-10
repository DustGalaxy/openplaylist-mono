<script setup lang="ts">
import { AccordionContent, type AccordionContentProps, useForwardProps } from 'radix-vue'
import { cn } from '@/6_shared/lib/utils'
import { computed } from 'vue'

const props = defineProps<AccordionContentProps & { class?: string }>()
const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props
  return delegated
})
const forwarded = useForwardProps(delegatedProps)
</script>

<template>
  <AccordionContent v-bind="forwarded" data-slot="accordion-content" class="overflow-hidden text-sm data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
    <div :class="cn('pt-0 pb-4', props.class)">
      <slot />
    </div>
  </AccordionContent>
</template>