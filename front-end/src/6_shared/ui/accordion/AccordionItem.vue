<script setup lang="ts">
import { AccordionItem, type AccordionItemProps, useForwardProps } from 'radix-vue'
import { cn } from '@/6_shared/lib/utils'
import { computed } from 'vue'

const props = defineProps<AccordionItemProps & { class?: string }>()
const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props
  return delegated
})
const forwarded = useForwardProps(delegatedProps)
</script>

<template>
  <AccordionItem v-bind="forwarded" data-slot="accordion-item" :class="cn('', props.class)">
    <slot />
  </AccordionItem>
</template>