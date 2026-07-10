<script setup lang="ts">
import { Toggle, type ToggleProps, type ToggleEmits, useForwardPropsEmits } from 'radix-vue'
import { toggleVariants } from './variants'
import { cn } from '@/6_shared/lib/utils'

interface ToggleVariantProps {
  variant?: 'default' | 'outline'
  size?: 'default' | 'sm' | 'lg'
}

const props = withDefaults(defineProps<ToggleProps & ToggleVariantProps & { class?: string }>(), {
  variant: 'default',
  size: 'default'
})
const emits = defineEmits<ToggleEmits>()

const forwarded = useForwardPropsEmits(props, emits)
</script>

<template>
  <Toggle
    v-bind="forwarded"
    data-slot="toggle"
    :class="cn(toggleVariants({ variant, size }), props.class)"
  >
    <slot />
  </Toggle>
</template>