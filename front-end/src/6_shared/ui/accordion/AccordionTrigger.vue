<script setup lang="ts">
import { AccordionHeader, AccordionTrigger, type AccordionTriggerProps, useForwardProps } from 'radix-vue'
import { ChevronDownIcon } from 'lucide-vue-next'
import { cn } from '@/6_shared/lib/utils'
import { computed } from 'vue'

const props = defineProps<AccordionTriggerProps & { class?: string }>()
const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props
  return delegated
})
const forwarded = useForwardProps(delegatedProps)
</script>

<template>
  <AccordionHeader class="flex">
    <AccordionTrigger v-bind="forwarded" data-slot="accordion-trigger" :class="cn('flex flex-1 items-start justify-between gap-4 rounded-md py-4 text-left text-sm font-medium transition-all outline-none hover:underline focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&[data-state=open]>svg]:rotate-180', props.class)">
      <slot />
      <ChevronDownIcon class="pointer-events-none size-4 shrink-0 translate-y-0.5 text-text-secondary transition-transform duration-200" />
    </AccordionTrigger>
  </AccordionHeader>
</template>