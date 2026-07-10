<script setup lang="ts">
import { RadioGroupRoot, type RadioGroupRootProps, type RadioGroupRootEmits, useForwardPropsEmits } from 'radix-vue'
import { cn } from '@/6_shared/lib/utils'

const props = defineProps<RadioGroupRootProps & { class?: string }>()
const emits = defineEmits<RadioGroupRootEmits>()
const forwarded = useForwardPropsEmits(props, emits)
</script>

<template>
  <RadioGroupRoot
    v-bind="forwarded"
    data-slot="radio-group"
    :class="cn('grid gap-3', props.class)"
  >
    <slot />
  </RadioGroupRoot>
</template>