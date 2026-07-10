<script setup lang="ts">
import { ToggleGroupItem, type ToggleGroupItemProps, useForwardProps } from 'radix-vue'
import { inject } from 'vue'
import { toggleVariants } from '../toggle/variants'
import { cn } from '@/6_shared/lib/utils'

interface ToggleGroupVariantProps {
  variant?: 'default' | 'outline'
  size?: 'default' | 'sm' | 'lg'
}

const props = defineProps<ToggleGroupItemProps & ToggleGroupVariantProps & { class?: string }>()
const forwarded = useForwardProps(props)

const context = inject<{ variant?: string, size?: string }>('toggleGroupContext', {})

const finalVariant = () => (context.variant || props.variant || 'default') as any
const finalSize = () => (context.size || props.size || 'default') as any
</script>

<template>
  <ToggleGroupItem
    v-bind="forwarded"
    data-slot="toggle-group-item"
    :data-variant="finalVariant()"
    :data-size="finalSize()"
    :class="cn(
      toggleVariants({ variant: finalVariant(), size: finalSize() }),
      'min-w-0 flex-1 shrink-0 rounded-none shadow-none first:rounded-l-md last:rounded-r-md focus:z-10 focus-visible:z-10 data-[variant=outline]:border-l-0 data-[variant=outline]:first:border-l',
      props.class
    )"
  >
    <slot />
  </ToggleGroupItem>
</template>