<script setup lang="ts">
import { DialogClose, type DialogCloseProps, useForwardProps } from 'radix-vue'
const props = defineProps<DialogCloseProps>()
const forwarded = useForwardProps(props)
</script>
<template>
  <DialogClose v-bind="forwarded" data-slot="dialog-close">
    <slot />
  </DialogClose>
</template>