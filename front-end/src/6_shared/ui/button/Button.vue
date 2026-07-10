<script setup lang="ts">
import { Primitive, type PrimitiveProps } from 'radix-vue'
import { buttonVariants } from './variants'
import { cn } from '@/6_shared/lib/utils'

interface ButtonVariantProps {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'xs' | 'sm' | 'lg' | 'icon' | 'icon-xs' | 'icon-sm' | 'icon-lg'
}

const props = withDefaults(defineProps<PrimitiveProps & ButtonVariantProps & { class?: string }>(), {
  as: 'button',
  variant: 'default',
  size: 'default',
})
</script>

<template>
  <Primitive
    :as="as"
    :as-child="asChild"
    data-slot="button"
    :data-variant="variant"
    :data-size="size"
    :class="cn(buttonVariants({ variant, size }), props.class)"
  >
    <slot />
  </Primitive>
</template>