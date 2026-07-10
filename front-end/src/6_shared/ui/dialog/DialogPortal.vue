<script setup lang="ts">
import { DialogPortal, type DialogPortalProps } from 'radix-vue'
const props = defineProps<DialogPortalProps>()
</script>
<template>
  <DialogPortal v-bind="props" data-slot="dialog-portal">
    <slot />
  </DialogPortal>
</template>