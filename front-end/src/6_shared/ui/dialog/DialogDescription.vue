<script setup lang="ts">
import { DialogDescription, type DialogDescriptionProps, useForwardProps } from 'radix-vue'
import { cn } from '@/6_shared/lib/utils'
const props = defineProps<DialogDescriptionProps & { class?: string }>()
</script>
<template>
  <DialogDescription v-bind="props" data-slot="dialog-description" :class="cn('text-text-secondary text-sm py-[2px]', props.class)">
    <slot />
  </DialogDescription>
</template>