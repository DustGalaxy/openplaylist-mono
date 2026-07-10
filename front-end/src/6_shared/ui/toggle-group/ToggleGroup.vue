<script setup lang="ts">
import { ToggleGroupRoot, type ToggleGroupRootProps, type ToggleGroupRootEmits, useForwardPropsEmits } from 'radix-vue'
import { provide } from 'vue'
import { cn } from '@/6_shared/lib/utils'

interface ToggleGroupVariantProps {
  variant?: 'default' | 'outline'
  size?: 'default' | 'sm' | 'lg'
}

const props = withDefaults(defineProps<ToggleGroupRootProps & ToggleGroupVariantProps & { class?: string }>(), {
  variant: 'default',
  size: 'default'
})
const emits = defineEmits<ToggleGroupRootEmits>()

const forwarded = useForwardPropsEmits(props, emits)

provide('toggleGroupContext', { variant: props.variant, size: props.size })
</script>

<template>
  <ToggleGroupRoot
    v-bind="forwarded"
    data-slot="toggle-group"
    :data-variant="variant"
    :data-size="size"
    :class="cn('group/toggle-group flex w-fit items-center rounded-md data-[variant=outline]:shadow-xs', props.class)"
  >
    <slot />
  </ToggleGroupRoot>
</template>