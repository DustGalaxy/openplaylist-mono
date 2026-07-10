<script setup lang="ts">
import { DialogTitle, type DialogTitleProps, useForwardProps } from 'radix-vue'
import { cn } from '@/6_shared/lib/utils'
const props = defineProps<DialogTitleProps & { class?: string }>()
</script>
<template>
  <DialogTitle v-bind="props" data-slot="dialog-title" :class="cn('text-lg leading-none font-semibold', props.class)">
    <slot />
  </DialogTitle>
</template>